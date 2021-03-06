

package com.ptoceti.osgi.modbus.impl.message;

/*
 * #%L
 * **********************************************************************
 * ORGANIZATION : ptoceti
 * PROJECT : Modbus
 * FILENAME : ReadHoldingRegistersMessageResponse.java
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

import java.io.InputStream;
import java.io.IOException;

public class ReadHoldingRegistersMessageResponse extends ModbusMessageResponse {

	private int[] arrayList = null;
	
	public ReadHoldingRegistersMessageResponse( byte unitID) {
		setFunctionID(ModbusMessage.READ_HOLDING_REGISTERS);
		setUnitID(unitID);
	}
	
	public ReadHoldingRegistersMessageResponse() {
		setFunctionID(ModbusMessage.READ_HOLDING_REGISTERS);
		setUnitID((byte)0);
	}
	
	
	public int getMessageLength() {
		int length = 0;
		
		return length;
	}
	
	public int[] getValues() {
	
		int[] result = new int[ arrayList.length ];
		for(int i = 0; i < result.length; i++ ) {
			result[i] = arrayList[i];
		}
		
		return result;
	}

	public boolean readData(InputStream in) {
		
		try {
			int byteCount = in.read();
			arrayList = new int[ byteCount / 2];
			for(int i = 0 ; i < ( byteCount / 2 ) ; i++ ) {
				arrayList[i] = (in.read() << 8);
				arrayList[i] = arrayList[i] + in.read();
			}
			
		} catch (IOException e ) {
			arrayList = null;
			return false;
		}
		
		return true;
	}

}
