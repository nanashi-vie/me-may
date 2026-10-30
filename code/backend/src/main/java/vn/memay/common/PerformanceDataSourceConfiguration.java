package vn.memay.common;

import javax.sql.DataSource;
import java.lang.reflect.*;
import java.sql.*;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.*;

@Configuration(proxyBeanMethods=false)
public class PerformanceDataSourceConfiguration {
    @Bean static BeanPostProcessor timedDataSources(PerformanceTimings timings) {
        return new BeanPostProcessor() {
            public Object postProcessAfterInitialization(Object bean,String name) {
                return timings.enabled() && bean instanceof DataSource ds ? wrap(ds,timings) : bean;
            }
        };
    }
    static DataSource wrap(DataSource delegate,PerformanceTimings timings) {
        return (DataSource)Proxy.newProxyInstance(DataSource.class.getClassLoader(),new Class[]{DataSource.class,AutoCloseable.class},
            (proxy,method,args)-> {
                if(method.getName().equals("close")) {
                    if(delegate instanceof AutoCloseable closeable)closeable.close();return null;
                }
                if(!method.getName().equals("getConnection"))return invoke(delegate,method,args);
                long start=System.nanoTime();String status="ok";
                try{return connection((Connection)invoke(delegate,method,args),timings);}
                catch(Throwable error){status="error";throw error;}
                finally{timings.record("connection",start,status);}
            });
    }
    private static Connection connection(Connection delegate,PerformanceTimings timings) {
        return (Connection)Proxy.newProxyInstance(Connection.class.getClassLoader(),new Class[]{Connection.class},(p,m,a)->{
            Object result=invoke(delegate,m,a);
            if(result instanceof Statement s && (m.getName().startsWith("prepare") || m.getName().equals("createStatement"))) {
                Class<?> type=s instanceof CallableStatement ? CallableStatement.class:s instanceof PreparedStatement ? PreparedStatement.class:Statement.class;
                return Proxy.newProxyInstance(type.getClassLoader(),new Class[]{type},(sp,sm,sa)->{
                    if(!sm.getName().startsWith("execute"))return invoke(s,sm,sa);
                    long start=System.nanoTime();String status="ok";
                    try{return invoke(s,sm,sa);}catch(Throwable error){status="error";throw error;}
                    finally{timings.record("query",start,status);}
                });
            }
            return result;
        });
    }
    private static Object invoke(Object target,Method method,Object[] args) throws Throwable {
        try{return method.invoke(target,args);}catch(InvocationTargetException e){throw e.getCause();}
    }
}
