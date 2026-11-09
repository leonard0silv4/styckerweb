export interface Transform {
  x: number;
  y: number;
  scale: number;
  angle: number;
}
export interface TextLayer extends Transform {
  id: string;
  text: string;
  font: string;
  size: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  align: "left" | "center" | "right";
  width: number;
}
export interface Project {
  version: 1;
  original: string;
  image: string;
  photo: Transform;
  texts: TextLayer[];
  border: { color: string; width: number };
}
export interface Sticker {
  version: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  thumbnail: string;
  final: string;
  project: Project;
}
export interface Collection {
  version: 1;
  items: Sticker[];
}
