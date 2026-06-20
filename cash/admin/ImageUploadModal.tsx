"use client";

import React, { useState } from "react";
import { Button, Modal, Box, Typography, CircularProgress } from "@mui/material";
import axios from "axios";

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

interface ImageUploadModalProps {
  onUploadSuccess?: () => void;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({ onUploadSuccess }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setFile(null);
    setOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://localhost:8080/api/images", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("Uploaded image URL:", res.data);
      setFile(null);
      handleClose();
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="contained" color="primary" onClick={handleOpen}>
        Upload Image
      </Button>
      <Modal open={open} onClose={handleClose}>
        <Box sx={style}>
          <Typography variant="h6" mb={2}>Upload Product Image</Typography>

          {/* Styled file input box */}
          <Box
            sx={{
              border: "2px dashed #1976d2",
              borderRadius: 2,
              height: 150,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              mb: 2,
              textAlign: "center",
              bgcolor: file ? "#e3f2fd" : "transparent",
              "&:hover": { bgcolor: "#f0f8ff" },
            }}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            {file ? (
              <Typography>{file.name}</Typography>
            ) : (
              <Typography color="text.secondary">
                Click here or drag a file to choose
              </Typography>
            )}
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </Box>

          {/* Image preview */}
          {file && (
            <Box mt={2} mb={2} textAlign="center">
              <img
                src={URL.createObjectURL(file)}
                alt="Preview"
                style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8 }}
              />
            </Box>
          )}

          <Box mt={2} display="flex" justifyContent="space-between">
            <Button variant="outlined" onClick={handleClose}>Cancel</Button>
            <Button variant="contained" onClick={handleUpload} disabled={!file || loading}>
              {loading ? <CircularProgress size={24} /> : "Upload"}
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
};
