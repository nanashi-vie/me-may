package vn.memay.media;

import com.cloudinary.Cloudinary;
import java.nio.file.*;
import java.util.*;

/** Operator-only isolated probe; prints timings/counts, never URLs or provider payloads. */
public class CloudinaryEagerProbe {
 public static void main(String[] args) throws Exception {
  String namespace=System.getenv("CLOUDINARY_NAMESPACE");
  if(!"memay/test".equals(namespace)&&!"memay/online-test".equals(namespace))throw new IllegalArgumentException("QA namespace required");
  var cloud=new Cloudinary(Map.of("cloud_name",System.getenv("CLOUDINARY_CLOUD_NAME"),"api_key",System.getenv("CLOUDINARY_API_KEY"),"api_secret",System.getenv("CLOUDINARY_API_SECRET"),"secure",true));
  try {
   if(args.length==1 && args[0].equals("usage")) {
    var usage=cloud.api().usage(Map.of());
    for(String key:List.of("credits","storage","bandwidth","transformations")) {
     Object value=usage.get(key);
     if(value instanceof Map map)for(String metric:List.of("usage","limit","used_percent"))
      if(map.get(metric) instanceof Number n)System.out.println(key+"."+metric+"="+n);
    }
    return;
   }
   if(args.length!=3 || !args[0].equals("probe"))throw new IllegalArgumentException("usage OR probe SOURCE NEW_LEDGER");
   var file=Path.of(args[1]);byte[] bytes=Files.readAllBytes(file);
   new ImageValidator().validate(bytes);
   // Isolated provider probe uses the same decoded content, Java JPEG encoder at0.85.
   // Frontend normalization is measured separately; these bytes are not that browser output.
   var image=javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(bytes));
   var rgb=new java.awt.image.BufferedImage(image.getWidth(),image.getHeight(),java.awt.image.BufferedImage.TYPE_INT_RGB);
   var graphics=rgb.createGraphics();graphics.setColor(java.awt.Color.WHITE);graphics.fillRect(0,0,rgb.getWidth(),rgb.getHeight());graphics.drawImage(image,0,0,null);graphics.dispose();
   var encoded=new java.io.ByteArrayOutputStream();var writer=javax.imageio.ImageIO.getImageWritersByFormatName("jpeg").next();
   try(var output=javax.imageio.ImageIO.createImageOutputStream(encoded)) {
    writer.setOutput(output);var params=writer.getDefaultWriteParam();params.setCompressionMode(javax.imageio.ImageWriteParam.MODE_EXPLICIT);params.setCompressionQuality(0.85f);
    writer.write(null,new javax.imageio.IIOImage(rgb,null,null),params);
   } finally {writer.dispose();}
   bytes=encoded.toByteArray();System.out.println("probe_jpeg_bytes="+bytes.length);
   String id=namespace+"/"+UUID.randomUUID();
   var ledger=Path.of(args[2]);Files.writeString(ledger,id+"\n",StandardOpenOption.CREATE_NEW);
   var options=new HashMap<String,Object>(CloudinaryMediaGateway.uploadOptions(id));var eager=options.remove("eager");
   long start=System.nanoTime();cloud.uploader().upload(bytes,options);
   System.out.println("upload_only_ms="+(System.nanoTime()-start)/1_000_000.0);
   start=System.nanoTime();var result=cloud.uploader().explicit(id,Map.of("type","authenticated","resource_type","image","eager",eager));
   System.out.println("explicit_eager_ms="+(System.nanoTime()-start)/1_000_000.0);
   System.out.println("derived_count="+((List<?>)result.get("eager")).size());
   // This probe's fresh UUID is never attached to any book; delete only this exact asset.
   var deletion=cloud.uploader().destroy(id,Map.of("type","authenticated","resource_type","image","invalidate",true));
   if(!Set.of("ok","not found").contains(deletion.get("result")))throw new IllegalStateException("Probe cleanup pending");
   Files.writeString(ledger,"deleted\n",StandardOpenOption.APPEND);
  } catch(Exception e) {System.err.println("QA probe failed ("+e.getClass().getSimpleName()+"); preserve ledger for recovery");System.exit(1);}
 }
}
