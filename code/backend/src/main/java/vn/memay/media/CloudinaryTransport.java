package vn.memay.media;
import java.io.*;
import java.net.URI;
import java.util.Map;
public interface CloudinaryTransport {
 Map<String,Object> post(URI uri,Map<String,Object> params,byte[] bytes)throws IOException;
 InputStream open(URI uri)throws IOException;
}
