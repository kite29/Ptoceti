package com.ptoceti.osgi.influxdb.impl.client.resources;

import org.restlet.resource.Get;
import org.restlet.resource.ResourceException;


public interface PingResource {

    static String  path = "ping";
    
    @Get
    void get();
}
