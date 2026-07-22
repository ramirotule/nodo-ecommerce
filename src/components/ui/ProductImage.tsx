"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { PRODUCT_IMAGE_FALLBACK } from "@/constants/images";

type Props = Omit<ImageProps, "src"> & {
  src?: string | null;
};

export default function ProductImage({ src, alt, onError, ...rest }: Props) {
  const [failed, setFailed] = useState(false);
  const effectiveSrc = !src || failed ? PRODUCT_IMAGE_FALLBACK : src;

  return (
    <Image
      {...rest}
      src={effectiveSrc}
      alt={alt}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
