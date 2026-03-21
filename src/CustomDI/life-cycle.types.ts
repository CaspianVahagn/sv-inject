
export interface PostConstructable{
  postConstruct(): void;
}

export interface Ejectable{
    onEject(): void;
}