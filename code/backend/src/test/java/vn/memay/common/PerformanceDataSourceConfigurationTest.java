package vn.memay.common;
import org.junit.jupiter.api.Test;
import javax.sql.DataSource;
import java.sql.*;
import java.util.*;
import java.lang.reflect.*;
import static org.junit.jupiter.api.Assertions.*;
class PerformanceDataSourceConfigurationTest {
 @Test void measuresJdbcWithoutSqlAndPreservesFailuresAndClose() throws Exception {
  var events=new ArrayList<PerformanceTimings.Event>();var t=new PerformanceTimings(true,events::add);var closed=new ArrayList<String>();
  Statement statement=(Statement)Proxy.newProxyInstance(getClass().getClassLoader(),new Class[]{Statement.class},(p,m,a)->{
   if(m.getName().equals("close")){closed.add("statement");return null;}
   if(m.getName().equals("execute"))throw new SQLException("SECRET");
   if(m.getName().equals("executeBatch"))return new int[]{1};return null;
  });
  Connection connection=(Connection)Proxy.newProxyInstance(getClass().getClassLoader(),new Class[]{Connection.class},(p,m,a)->{
   if(m.getName().equals("createStatement"))return statement;if(m.getName().equals("close"))closed.add("connection");return null;
  });
  DataSource source=(DataSource)Proxy.newProxyInstance(getClass().getClassLoader(),new Class[]{DataSource.class},(p,m,a)->{
   if(m.getName().equals("getConnection"))return connection;if(m.getName().equals("isWrapperFor"))return true;if(m.getName().equals("unwrap"))return p;return null;
  });
  DataSource measured=PerformanceDataSourceConfiguration.wrap(source,t);
  try(var trace=t.start("publish");var c=measured.getConnection("SECRET","SECRET");var s=c.createStatement()) {
   assertThrows(SQLException.class,()->s.execute("select SECRET"));assertArrayEquals(new int[]{1},s.executeBatch());
   assertTrue(measured.isWrapperFor(DataSource.class));assertSame(source,measured.unwrap(DataSource.class));
  }
  assertEquals(List.of("statement","connection"),closed);
  assertEquals(2,events.stream().filter(e->e.phase().equals("query")).mapToLong(PerformanceTimings.Event::count).sum());
  assertTrue(events.stream().anyMatch(e->e.phase().equals("connection")));assertFalse(events.toString().contains("SECRET"));
 }
}
