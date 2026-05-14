import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const dataPath = path.resolve("public/data/ui-prompt-styles.json");
const previewDir = path.resolve("public/images/style-prompt-previews");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const verbose = process.argv.includes("--verbose");
const SIGNATURE_LANGUAGES = ["zh-CN", "en-US"];
const SIGNATURE_KINDS = ["style", "custom"];

const TAILWIND_CLASS_PATTERN =
  /^(?:-)?(?:absolute|backdrop-|bg-|blur|border|bottom-|cursor-|duration-|flex|font-|from-|gap-|grid|group|h-|hover:|inset-|items-|justify-|left-|m[blrtxy]?-|max-w-|mb-|min-h-|opacity-|overflow-|p[blrtxy]?-|relative|right-|rotate-|rounded|scale-|shadow|space-|text-|to-|top-|transform|transition|via-|w-|z-)/;

function hasInlineStyles(html) {
  return /<style[\s>]/i.test(html);
}

function hasTailwindUtilityClasses(html) {
  const classMatches = html.matchAll(/\bclass=(["'])([^"']*)\1/gi);

  for (const match of classMatches) {
    const classes = match[2].split(/\s+/).filter(Boolean);

    if (classes.some((className) => TAILWIND_CLASS_PATTERN.test(className))) {
      return true;
    }
  }

  return false;
}

function hasPromptFallback(prompts, kind, language) {
  return Boolean(
    prompts?.[kind]?.[language]?.trim() ||
      prompts?.style?.[language]?.trim() ||
      prompts?.custom?.[language]?.trim()
  );
}

function addIssue(target, type, id, detail = "") {
  target.push({ type, id, detail });
}

function getPromptContent(prompts, kind, language) {
  return prompts?.[kind]?.[language] || prompts?.style?.[language] || prompts?.custom?.[language] || "";
}

function getResolvedPromptContent(family, template, kind, language) {
  const templatePromptContent = template ? getPromptContent(template.prompts, kind, language) : "";
  const familyPromptContent = family ? getPromptContent(family.prompts, kind, language) : "";
  return templatePromptContent || familyPromptContent;
}

function normalizePromptSignatureValue(value) {
  return value.replace(/\s+/g, " ").trim();
}

function getEffectivePromptSignature(family, template) {
  return SIGNATURE_KINDS.flatMap((kind) =>
    SIGNATURE_LANGUAGES.map((language) =>
      normalizePromptSignatureValue(getResolvedPromptContent(family, template, kind, language))
    )
  ).join("||");
}

function paethPredictor(left, up, upLeft) {
  const predictor = left + up - upLeft;
  const leftDistance = Math.abs(predictor - left);
  const upDistance = Math.abs(predictor - up);
  const upLeftDistance = Math.abs(predictor - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }

  if (upDistance <= upLeftDistance) {
    return up;
  }

  return upLeft;
}

function inspectPreviewPng(filePath) {
  const buffer = fs.readFileSync(filePath);

  if (!buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error("invalid png signature");
  }

  let cursor = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (cursor < buffer.length) {
    const length = buffer.readUInt32BE(cursor);
    const type = buffer.subarray(cursor + 4, cursor + 8).toString("ascii");
    const chunk = buffer.subarray(cursor + 8, cursor + 8 + length);
    cursor += length + 12;

    if (type === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      bitDepth = chunk.readUInt8(8);
      colorType = chunk.readUInt8(9);
    } else if (type === "IDAT") {
      idatChunks.push(chunk);
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error(`unsupported png format ${bitDepth}/${colorType}`);
  }

  const bytesPerPixel = colorType === 2 ? 3 : 4;
  const stride = width * bytesPerPixel;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const background = [237, 240, 247];
  let offset = 0;
  let sameColor = true;
  let firstPixel = null;
  let totalPixels = 0;
  let nearBackgroundPixels = 0;
  const sums = [0, 0, 0];
  const sumsSquared = [0, 0, 0];
  let previousRow = Buffer.alloc(stride);

  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    const filterType = inflated.readUInt8(offset);
    offset += 1;
    const row = Buffer.from(inflated.subarray(offset, offset + stride));
    offset += stride;
    const reconstructed = Buffer.alloc(stride);

    for (let index = 0; index < stride; index += 1) {
      const left = index >= bytesPerPixel ? reconstructed[index - bytesPerPixel] : 0;
      const up = previousRow[index];
      const upLeft = index >= bytesPerPixel ? previousRow[index - bytesPerPixel] : 0;
      let value = row[index];

      if (filterType === 1) {
        value = (value + left) & 255;
      } else if (filterType === 2) {
        value = (value + up) & 255;
      } else if (filterType === 3) {
        value = (value + Math.floor((left + up) / 2)) & 255;
      } else if (filterType === 4) {
        value = (value + paethPredictor(left, up, upLeft)) & 255;
      }

      reconstructed[index] = value;
    }

    previousRow = reconstructed;

    for (let pixelOffset = 0; pixelOffset < stride; pixelOffset += bytesPerPixel) {
      const pixel = [
        reconstructed[pixelOffset],
        reconstructed[pixelOffset + 1],
        reconstructed[pixelOffset + 2]
      ];

      if (!firstPixel) {
        firstPixel = pixel;
      } else if (
        sameColor &&
        (pixel[0] !== firstPixel[0] || pixel[1] !== firstPixel[1] || pixel[2] !== firstPixel[2])
      ) {
        sameColor = false;
      }

      totalPixels += 1;

      for (let channel = 0; channel < 3; channel += 1) {
        sums[channel] += pixel[channel];
        sumsSquared[channel] += pixel[channel] * pixel[channel];
      }

      if (
        Math.abs(pixel[0] - background[0]) <= 8 &&
        Math.abs(pixel[1] - background[1]) <= 8 &&
        Math.abs(pixel[2] - background[2]) <= 8
      ) {
        nearBackgroundPixels += 1;
      }
    }
  }

  const averageStdDev =
    sums.reduce((total, sum, channel) => {
      const mean = sum / totalPixels;
      const variance = sumsSquared[channel] / totalPixels - mean * mean;
      return total + Math.sqrt(Math.max(variance, 0));
    }, 0) / 3;

  const nearBackgroundRatio = totalPixels === 0 ? 0 : nearBackgroundPixels / totalPixels;
  const isBlank = sameColor || (averageStdDev < 1 && nearBackgroundRatio > 0.995);

  return {
    width,
    height,
    isBlank,
    averageStdDev,
    nearBackgroundRatio
  };
}

const errors = [];
const warnings = [];
const categoryIds = new Set();
const familyIds = new Set();
const templateIds = new Set();
let templates = 0;
let demos = 0;
let tailwindRuntimeDemos = 0;
let previewPngs = 0;
let blankPreviewPngs = 0;
let distinctTemplates = 0;
let duplicateTemplateScenes = 0;
let familiesWithDuplicateTemplateScenes = 0;
let familiesWithOnlyBasePrompt = 0;

if (!Array.isArray(data.categories)) {
  addIssue(errors, "invalid_categories", "root", "categories must be an array");
}

if (!Array.isArray(data.families)) {
  addIssue(errors, "invalid_families", "root", "families must be an array");
}

for (const category of data.categories ?? []) {
  if (!category.id) {
    addIssue(errors, "missing_category_id", "category");
    continue;
  }

  if (categoryIds.has(category.id)) {
    addIssue(errors, "duplicate_category_id", category.id);
  }

  categoryIds.add(category.id);
}

for (const family of data.families ?? []) {
  const familyId = family.id || family.familyId || "unknown-family";
  const familyBaseSignature = getEffectivePromptSignature(family, null);
  const seenTemplateSignatures = new Map([[familyBaseSignature, "family_base_prompt"]]);
  let familyDistinctTemplateCount = 0;
  let familyDuplicateTemplateCount = 0;

  if (!family.id) {
    addIssue(errors, "missing_family_id", familyId);
  } else if (familyIds.has(family.id)) {
    addIssue(errors, "duplicate_family_id", family.id);
  }

  familyIds.add(family.id);

  if (!family.category?.id || !categoryIds.has(family.category.id)) {
    addIssue(errors, "unknown_family_category", familyId, family.category?.id ?? "missing");
  }

  if (!family.name?.zh?.trim() || !family.name?.en?.trim()) {
    addIssue(errors, "missing_family_name", familyId);
  }

  if (!family.description?.zh?.trim() || !family.description?.en?.trim()) {
    addIssue(errors, "missing_family_description", familyId);
  }

  for (const kind of ["style", "custom"]) {
    for (const language of ["zh-CN", "en-US"]) {
      if (!hasPromptFallback(family.prompts, kind, language)) {
        addIssue(errors, "missing_family_prompt", familyId, `${kind}.${language}`);
      } else if (!family.prompts?.[kind]?.[language]?.trim()) {
        addIssue(warnings, "family_prompt_uses_fallback", familyId, `${kind}.${language}`);
      }
    }
  }

  if (!family.demo) {
    addIssue(errors, "missing_demo", familyId);
  } else {
    demos += 1;

    const html = family.demo.html ?? "";
    const css = family.demo.css ?? "";

    if (!html.trim()) {
      addIssue(errors, "empty_demo_html", familyId);
    }

    if (!css.trim()) {
      if (hasInlineStyles(html)) {
        addIssue(warnings, "empty_demo_css_uses_inline_style", familyId);
      } else if (hasTailwindUtilityClasses(html)) {
        tailwindRuntimeDemos += 1;
        addIssue(warnings, "empty_demo_css_uses_tailwind_runtime", familyId);
      } else {
        addIssue(errors, "empty_demo_css_without_runtime", familyId);
      }
    }

    if (/\n\s*#{2,6}\s+\S[\s\S]*$/u.test(html)) {
      addIssue(warnings, "markdown_tail_in_demo_html", familyId);
    }
  }

  const previewPath = path.join(previewDir, `${familyId}.png`);

  if (!fs.existsSync(previewPath)) {
    addIssue(warnings, "missing_preview_png", familyId);
  } else {
    previewPngs += 1;

    try {
      const previewStats = inspectPreviewPng(previewPath);

      if (previewStats.isBlank) {
        blankPreviewPngs += 1;
        addIssue(
          warnings,
          "blank_preview_png",
          familyId,
          `std=${previewStats.averageStdDev.toFixed(2)} near_bg=${previewStats.nearBackgroundRatio.toFixed(3)}`
        );
      }
    } catch (error) {
      addIssue(
        errors,
        "invalid_preview_png",
        familyId,
        error instanceof Error ? error.message : "unknown preview error"
      );
    }
  }

  for (const template of family.templates ?? []) {
    templates += 1;
    const templateKey = `${familyId}/${template.id || "unknown-template"}`;

    if (!template.id) {
      addIssue(errors, "missing_template_id", templateKey);
    } else if (templateIds.has(template.id)) {
      addIssue(errors, "duplicate_template_id", template.id);
    }

    templateIds.add(template.id);

    if (!template.title?.zh?.trim() || !template.title?.en?.trim()) {
      addIssue(errors, "missing_template_title", templateKey);
    }

    for (const kind of ["style", "custom"]) {
      for (const language of ["zh-CN", "en-US"]) {
        const hasOwnPrompt = template.prompts?.[kind]?.[language]?.trim();
        const hasFamilyFallback = hasPromptFallback(family.prompts, kind, language);

        if (!hasOwnPrompt && !hasFamilyFallback) {
          addIssue(errors, "missing_template_prompt", templateKey, `${kind}.${language}`);
        } else if (!hasOwnPrompt) {
          addIssue(warnings, "template_prompt_uses_family_fallback", templateKey, `${kind}.${language}`);
        }
      }
    }

    const templateSignature = getEffectivePromptSignature(family, template);
    const duplicateSource = seenTemplateSignatures.get(templateSignature);

    if (duplicateSource) {
      familyDuplicateTemplateCount += 1;
      duplicateTemplateScenes += 1;
      addIssue(warnings, "duplicate_template_prompt_signature", templateKey, `matches ${duplicateSource}`);
      continue;
    }

    familyDistinctTemplateCount += 1;
    seenTemplateSignatures.set(templateSignature, template.id || templateKey);
  }

  distinctTemplates += familyDistinctTemplateCount;

  if (familyDuplicateTemplateCount > 0) {
    familiesWithDuplicateTemplateScenes += 1;
  }

  if ((family.templates?.length ?? 0) > 0 && familyDistinctTemplateCount === 0) {
    familiesWithOnlyBasePrompt += 1;
    addIssue(warnings, "family_templates_collapse_to_base_prompt", familyId, `${family.templates.length} templates`);
  }
}

const summary = {
  categories: data.categories?.length ?? 0,
  families: data.families?.length ?? 0,
  templates,
  distinctTemplates,
  demos,
  previewPngs,
  blankPreviewPngs,
  tailwindRuntimeDemos,
  duplicateTemplateScenes,
  familiesWithDuplicateTemplateScenes,
  familiesWithOnlyBasePrompt,
  errors: errors.length,
  warnings: warnings.length
};

function countByType(issues) {
  return issues.reduce((counts, issue) => {
    counts[issue.type] = (counts[issue.type] ?? 0) + 1;
    return counts;
  }, {});
}

console.log(
  JSON.stringify(
    verbose
      ? { summary, errors, warnings }
      : {
          summary,
          errorTypes: countByType(errors),
          warningTypes: countByType(warnings)
        },
    null,
    2
  )
);

if (errors.length > 0) {
  process.exitCode = 1;
}
