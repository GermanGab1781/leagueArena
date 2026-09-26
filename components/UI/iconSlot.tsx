'use client';

import Image from "next/image";
import { useState } from "react";

type IconSlotProps = {
    code: string;
    label: string;
    src?: string;
    className?: string;
    textClassName?: string;
    imageClassName?: string;
};

export default function IconSlot({
    code,
    label,
    src,
    className = "",
    textClassName = "",
    imageClassName = "",
}: IconSlotProps) {
    const [imageFailed, setImageFailed] = useState(false);
    const showImage = !!src && !imageFailed;

    return (
        <div
            aria-hidden="true"
            title={label}
            className={`relative h-9 w-9 shrink-0 rounded border bg-black/20 flex items-center justify-center overflow-hidden ${className}`}
        >
            {showImage ? (
                <Image
                    src={src}
                    alt=""
                    fill
                    sizes="36px"
                    className={`object-contain p-[3px] ${imageClassName}`}
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <span className={`text-[10px] font-black tracking-[0.14em] ${textClassName}`}>{code}</span>
            )}
        </div>
    );
}
