package vn.memay.media;

import com.cloudinary.*;
import com.cloudinary.strategies.AbstractUploaderStrategy;
import java.io.*;
import java.net.URI;
import java.util.*;
import vn.memay.common.AdminApiException;

public class CloudinaryMediaGateway implements MediaGateway {
    @org.springframework.beans.factory.annotation.Autowired private vn.memay.common.PerformanceTimings timings = new vn.memay.common.PerformanceTimings(false);

    static final String PREVIEW = "a_auto/c_limit,w_1280/fl_strip_profile,f_jpg";
    static final String PUBLIC_PREVIEW = publicTransform(640, "jpg");
    static String publicTransform(int width, String format) {
        if ((width != 320 && width != 640) || !List.of("jpg", "webp").contains(format))
            throw new IllegalArgumentException("Invalid media variant");
        return "a_auto/c_limit,w_" + width + "/q_auto:good/fl_strip_profile,f_" + format;
    }
    private final Cloudinary cloud;
    private final Uploader uploader;
    private final CloudinaryTransport transport;
    private final String namespace;

    public CloudinaryMediaGateway(String cloudName, String apiKey, String apiSecret, String namespace,
            CloudinaryTransport transport) {
        if (!cloudName.matches("[a-zA-Z0-9_-]+") || !namespace.matches("memay/(dev|test|online-test)"))
            throw new IllegalArgumentException("Invalid media configuration");
        this.namespace = namespace;
        this.transport = transport;
        this.cloud = new Cloudinary(Map.of("cloud_name", cloudName, "api_key", apiKey, "api_secret", apiSecret,
                "secure", true, "load_strategies", false));
        this.uploader = new Uploader(cloud, new AbstractUploaderStrategy() {
            public Map callApi(String action, Map<String, Object> params, Map options, Object file,
                    ProgressCallback callback) throws IOException {
                uploader.signRequestParams(params, options);
                return transport.post(URI.create(buildUploadUrl(action, options)), params, (byte[]) file);
            }
        });
    }

    static Map<String, Object> uploadOptions(String id) {
        var eager = new ArrayList<Transformation<?>>();
        eager.add(new Transformation<>().rawTransformation(PREVIEW));
        for (int width : List.of(320, 640)) for (String format : List.of("jpg", "webp"))
            eager.add(new Transformation<>().rawTransformation(publicTransform(width, format)));
        return Map.of("public_id", id, "resource_type", "image", "type", "authenticated", "overwrite", false,
                "unique_filename", false, "eager", eager);
    }

    static void validatePublicId(String id, String namespace) {
        if (id == null || !id.matches(java.util.regex.Pattern.quote(namespace)
                + "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"))
            throw new IllegalArgumentException("Invalid media key");
    }

    public UploadedMedia upload(String publicId, byte[] bytes) {
        validatePublicId(publicId, namespace);
        try {
            Map result = timings.measure("provider", () -> {try {return uploader.upload(bytes, uploadOptions(publicId));} catch(Exception e) {throw failure();}});
            if (!publicId.equals(result.get("public_id")) || !"authenticated".equals(result.get("type")))
                throw new IOException();
            return new UploadedMedia((String) result.get("asset_id"), publicId, (String) result.get("format"),
                    ((Number) result.get("bytes")).longValue(), ((Number) result.get("width")).intValue(),
                    ((Number) result.get("height")).intValue());
        } catch (Exception e) {
            throw failure();
        }
    }

    public InputStream openPreview(String publicId) {
        return openAdminPreview(publicId,1280);
    }

    public InputStream openAdminPreview(String publicId,int width) {
        if(width!=320 && width!=1280)throw new IllegalArgumentException("Invalid admin media size");
        validatePublicId(publicId, namespace);
        try {
            try {return openTimed(previewUrl(publicId,width==320 ? publicTransform(320,"jpg"):PREVIEW));}
            catch(CloudinaryTransport.MissingVariantException missing) {
                if(width!=320)throw missing;
                return openTimed(previewUrl(publicId,PREVIEW));
            }
        } catch (Exception e) {
            throw failure();
        }
    }

    private InputStream openTimed(URI uri) throws IOException {
        long start=System.nanoTime();String status="ok";
        try{return transport.open(uri);}catch(IOException | RuntimeException e){status="error";throw e;}
        finally{timings.record("provider_open",start,status);}
    }

    public InputStream openPublicPreview(String publicId) {
        return openPublicPreview(publicId, 640, "jpg");
    }

    public InputStream openPublicPreview(String publicId, int width, String format) {
        String transform = publicTransform(width, format);
        validatePublicId(publicId, namespace);
        try {
            try {
                return transport.open(previewUrl(publicId, transform, format));
            } catch (CloudinaryTransport.MissingVariantException missingVariant) {
                if (width != 640 || !format.equals("jpg")) throw missingVariant;
                return timings.measure("provider_open", () -> {try{return transport.open(previewUrl(publicId, PREVIEW));}catch(Exception e){throw failure();}});
            }
        } catch (Exception e) {
            throw failure();
        }
    }

    private URI previewUrl(String publicId, String transform) {
        return previewUrl(publicId, transform, "jpg");
    }
    private URI previewUrl(String publicId, String transform, String format) {
        return URI.create(cloud.url().secure(true).signed(true).resourceType("image").type("authenticated")
                .transformation(new Transformation<>().rawTransformation(transform)).format(format).generate(publicId));
    }

    public DeleteResult delete(String publicId) {
        validatePublicId(publicId, namespace);
        try {
            var result = uploader.destroy(publicId,
                    Map.of("resource_type", "image", "type", "authenticated", "invalidate", true));
            return switch (String.valueOf(result.get("result"))) {
                case "ok" -> DeleteResult.DELETED;
                case "not found" -> DeleteResult.NOT_FOUND;
                default -> throw new IOException();
            };
        } catch (Exception e) {
            throw failure();
        }
    }

    private AdminApiException failure() {
        return new AdminApiException(502, "media_provider_error");
    }
}
