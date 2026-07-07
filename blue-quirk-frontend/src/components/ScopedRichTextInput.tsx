"use client";

import React from "react";
import { RichTextInput } from "ra-input-rich-text";

// Import Quill CSS only here (scoped)
import "react-quill/dist/quill.snow.css";
import "react-quill/dist/quill.core.css";

export const ScopedRichTextInput: React.FC<React.ComponentProps<typeof RichTextInput>> = (props) => {
  return <RichTextInput {...props} />;
};
