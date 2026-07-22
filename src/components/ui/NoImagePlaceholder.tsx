import ProductImage from "@/components/ui/ProductImage";

interface Props {
  width: number;
  height: number;
  fill?: boolean;
  sizes?: string;
  className?: string;
}

export default function NoImagePlaceholder({ width, height, fill, sizes, className }: Props) {
  if (fill) {
    return (
      <ProductImage
        src={null}
        alt="Imagen no disponible"
        fill
        sizes={sizes}
        className={className}
      />
    );
  }

  return (
    <ProductImage
      src={null}
      alt="Imagen no disponible"
      width={width}
      height={height}
      className={className}
    />
  );
}
