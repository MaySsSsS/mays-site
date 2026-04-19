export interface Photo {
  id: string;
  title: string;
  description?: string;
  date?: string;
  url?: string;
}

export interface PhotoGroup {
  id: string;
  name: string;
  city: string;
  location?: {
    lat: number;
    lng: number;
  };
  coverUrl?: string;
  photos: Photo[];
  createdAt: string;
}

export interface CityCoordinate {
  lat: number;
  lng: number;
  top: string;
  left: string;
}

export interface UploadPhotoInput {
  title: string;
  description?: string;
  date?: string;
  url?: string;
  file?: File;
}
