package com.ptoceti.osgi.obix.impl.guice;

/*
 * #%L
 * **********************************************************************
 * ORGANIZATION : ptoceti
 * PROJECT : Obix-Lib
 * FILENAME : ObixModule.java
 * 
 * This file is part of the Ptoceti project. More information about
 * this project can be found here: http://www.ptoceti.com/
 * **********************************************************************
 * %%
 * Copyright (C) 2013 - 2014 ptoceti
 * %%
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * #L%
 */


import com.google.inject.AbstractModule;
import com.google.inject.Provides;
import com.ptoceti.osgi.obix.domain.AboutDomain;
import com.ptoceti.osgi.obix.domain.HistoryDomain;
import com.ptoceti.osgi.obix.domain.ObjDomain;
import com.ptoceti.osgi.obix.domain.WatchDomain;
import com.ptoceti.osgi.obix.impl.domain.AboutDomainImpl;
import com.ptoceti.osgi.obix.impl.domain.HistoryDomainImpl;
import com.ptoceti.osgi.obix.impl.domain.ObjDomainImpl;
import com.ptoceti.osgi.obix.impl.domain.WatchDomainImpl;
import com.ptoceti.osgi.obix.impl.proxy.jdbc.JdbcConnectionProxyFactory;

/**
 * Configuration module for Guice.
 * 
 * @author LATHIL
 *
 */
public class ObixModule extends AbstractModule{
	/**
	 * factory for WatchDomain JdbcConnection proxys
	 */
	JdbcConnectionProxyFactory<WatchDomain> watchProxyFactory;
	/**
	 * factory for ObjDomain JdbcConnection proxys
	 */
	JdbcConnectionProxyFactory<ObjDomain> objProxyFactory;
	/**
	 * factory for HistoryDomain JdbcConnection proxys
	 */
	JdbcConnectionProxyFactory<HistoryDomain> historyProxyFactory;
	
	/**
	 * Constructor
	 * 
	 */
	public ObixModule() {
		watchProxyFactory = new JdbcConnectionProxyFactory<WatchDomain>();
		objProxyFactory = new JdbcConnectionProxyFactory<ObjDomain>();
		historyProxyFactory = new JdbcConnectionProxyFactory<HistoryDomain>();
		
	}
	
	/**
	 * Configure bindings.
	 */
	@Override
	protected void configure() {
		bind(AboutDomain.class).to((Class<? extends AboutDomain>) AboutDomainImpl.class);
	}
	
	/**
	 * Provide WatchDomain implementation
	 * @return
	 */
	@Provides
	WatchDomain provideWatchDomain(){
		return watchProxyFactory.createProxy( WatchDomainImpl.class, WatchDomain.class);
	}
	/**
	 * Provide ObjDomain implementation
	 * @return
	 */
	@Provides
	ObjDomain provideObjDomain() {
		return objProxyFactory.createProxy( ObjDomainImpl.class, ObjDomain.class);
	}
	/**
	 * Provide HistoryDomain implementation
	 * @return
	 */
	@Provides
	HistoryDomain provideHistoryDomain() {
		return historyProxyFactory.createProxy( HistoryDomainImpl.class, HistoryDomain.class);
	}
	

}