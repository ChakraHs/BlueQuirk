package shop.bluequirk.blue_quirk_backend.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import shop.bluequirk.blue_quirk_backend.entity.Image;
import shop.bluequirk.blue_quirk_backend.repository.ImageRepository;
import shop.bluequirk.blue_quirk_backend.service.R2StorageService;


@RestController
@RequestMapping("/api/images")
public class ImageController {

    private final ImageRepository imageRepository;
    private final R2StorageService r2StorageService;

    // Folder to store uploaded images (fallback when R2 is not configured)
    private final String uploadDir = "/app/uploads/";

    @Autowired
    public ImageController(ImageRepository imageRepository, R2StorageService r2StorageService) {
        this.imageRepository = imageRepository;
        this.r2StorageService = r2StorageService;

        // Create the upload folder if it doesn't exist
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            try {
                Files.createDirectories(uploadPath);
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }

    // GET: List images with pagination
    @GetMapping
    public ResponseEntity<List<Image>> getImages(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<Image> imagePage = imageRepository.findAll(PageRequest.of(page, size));

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Range",
                String.format("images %d-%d/%d",
                        page * size,
                        Math.min((page + 1) * size - 1, (int) imagePage.getTotalElements() - 1),
                        imagePage.getTotalElements())
        );
        headers.add("Access-Control-Expose-Headers", "Content-Range"); // CORS

        return ResponseEntity.ok().headers(headers).body(imagePage.getContent());
    }

    // POST: Upload a new image
    @PostMapping
    public ResponseEntity<Image> uploadImage(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            // Normalize file name
            String filename = StringUtils.cleanPath(file.getOriginalFilename());

            Image image = new Image();
            image.setFileName(filename);

            if (r2StorageService.isConfigured()) {
                // Preferred: store in Cloudflare R2 and keep its public URL.
                String url = r2StorageService.upload(file.getBytes(), filename, file.getContentType());
                image.setUrl(url);
            } else {
                // Fallback: store on local disk, served by WebConfig's /uploads/** handler.
                Path targetPath = Paths.get(uploadDir).resolve(filename);
                Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
                image.setUrl("/uploads/" + filename);
            }

            Image saved = imageRepository.save(image);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }
}
