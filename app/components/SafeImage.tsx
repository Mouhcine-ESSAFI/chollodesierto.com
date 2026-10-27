import type {ImgHTMLAttributes} from 'react';

export interface SafeImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** May be empty — metaobject file_reference fields are unset until files are uploaded. */
  src?: string;
  alt: string;
  /** Extra classes for the placeholder, e.g. a different tint per surface. */
  placeholderClassName?: string;
}

/**
 * Renders an <img>, or a neutral filled box when there is no src.
 *
 * Shopify metaobjects drive most imagery, and their file_reference fields are
 * empty until files are uploaded. Passing '' straight to <img src> gives a
 * broken-image icon and, in some browsers, a request to the current page — a
 * plain placeholder that keeps the same box is better on both counts.
 */
export function SafeImage({
  src,
  alt,
  className,
  placeholderClassName,
  ...rest
}: SafeImageProps) {
  if (!src) {
    return (
      <div
        aria-hidden="true"
        className={[className, 'bg-sand', placeholderClassName].filter(Boolean).join(' ')}
      />
    );
  }
  return <img src={src} alt={alt} className={className} {...rest} />;
}
