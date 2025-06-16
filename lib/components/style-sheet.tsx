import React, {forwardRef} from 'react';

import type {StyleSheetProps} from '../../typings/hyper';
import { useDevicePixelRatio } from 'use-device-pixel-ratio';

const StyleSheet = forwardRef<HTMLStyleElement, StyleSheetProps>((props, ref) => {
  const {borderColor} = props;

  const dpr = useDevicePixelRatio();

  return (
    <style jsx global ref={ref}>{`
      ::-webkit-scrollbar {
        width: ${5 * dpr}px;
      }
      ::-webkit-scrollbar-thumb {
        -webkit-border-radius: 10px;
        border-radius: 10px;
        background: ${borderColor};
      }
      ::-webkit-scrollbar-thumb:window-inactive {
        background: ${borderColor};
      }
    `}</style>
  );
});

StyleSheet.displayName = 'StyleSheet';

export default StyleSheet;
