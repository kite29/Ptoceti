package com.ptoceti.osgi.obix.object;

/*
 * #%L
 * **********************************************************************
 * ORGANIZATION : ptoceti
 * PROJECT : Obix-Api
 * FILENAME : Feed.java
 * 
 * This file is part of the Ptoceti project. More information about
 * this project can be found here: http://www.ptoceti.com/
 * **********************************************************************
 * %%
 * Copyright (C) 2013 - 2015 ptoceti
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



public class Feed extends Obj {

	/**
	 * 
	 */
	private static final long serialVersionUID = -6282142713591848813L;

	public static final Contract contract = new Contract("obix:feed");
	
	protected Contract in;
	protected Contract of;
	
	public Feed() {
		super();
	}
	
	public Feed(Obj model) {
		super(model);
	}
	
	public Feed( String name) {
		super(name);
	}
	
	public Feed( String name, Contract in, Contract of){
		super(name);
		setIn(in);
		setOf(of);
	}
	
	public void setIn(Contract in) {
		this.in = in;
	}
	public Contract getIn() {
		return in;
	}
	public void setOf(Contract of) {
		this.of = of;
	}
	public Contract getOf() {
		return of;
	}
	
	@Override
	public Obj cloneEmpty() {
		return new Feed();
	}
	
	@Override
	public Contract getContract(){
		return contract;
	}
}
