"use client";

import React from "react";
import { Box, Card, CardMedia, Typography, CircularProgress } from "@mui/material";
import axios from "axios";

interface Image {
  id: number;
  url: string;
  fileName?: string;
}

const BACKEND_URL = "http://localhost:8080";

export const ImageGallery: React.FC = () => {
  const [images, setImages] = React.useState<Image[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token"); // your JWT token
      const res = await axios.get<Image[]>(`${BACKEND_URL}/api/images`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      setImages(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchImages();
  }, []);

  if (loading) return <CircularProgress />;

  if (images.length === 0)
    return <Typography>No images uploaded yet</Typography>;

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 2,
        mt: 2,
      }}
    >
      {images.map((img) => (
        <Card
          key={img.id}
          sx={{ width: 200, borderRadius: 2, overflow: "hidden", boxShadow: 3 }}
        >
          <CardMedia
            component="img"
            height="140"
            image={`${BACKEND_URL}${img.url}`}
            alt={img.fileName || "Image"}
          />
        </Card>
      ))}
    </Box>
  );
};
