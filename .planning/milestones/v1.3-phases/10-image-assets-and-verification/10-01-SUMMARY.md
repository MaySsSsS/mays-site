# Summary 10-01: Image Assets And Zip Export

## Completed

- Added generated image asset state to the hidden converter.
- Used Mammoth `convertImage` to extract embedded image bytes locally.
- Rewrote Markdown image sources to stable paths such as
  `./assets/image-1.png`.
- Added an image asset summary after conversion.
- Added ZIP export containing `document.md` and `assets/` files.

## Files Changed

- `components/tools/WordToMarkdown.tsx`
- `styles/tools/word-to-markdown.module.css`
