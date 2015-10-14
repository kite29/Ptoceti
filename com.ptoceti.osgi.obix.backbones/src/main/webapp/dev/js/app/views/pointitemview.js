/*
 * #%L
 * **********************************************************************
 * ORGANIZATION : Ptoceti
 * PROJECT : Obix Backbones
 * FILENAME : pointitemview.js
 * 
 * This file is part of the Ptoceti project. More information about
 * this project can be found here: http://www.ptoceti.com/
 * **********************************************************************
 * %%
 * Copyright (C) 2013 - 2014 Ptoceti
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
define([ 'backbone', 'marionette', 'underscore', 'jquery', 'models/obix', 'modelbinder', 'courier', "i18n!nls/unittext", "i18n!nls/statustext", 'bootstrap' ], function(Backbone, Marionette, _, $, Obix, ModelBinder, Courier, unitText, statusText) {
	
	var PointItemView = Backbone.Marionette.ItemView.extend({
		tagName: "tr",
		template: "pointitem",
		className: "pointItem listItem",
	
		templateHelpers :  {
			contentEditable : function() {
				return Modernizr.contenteditable;
			}
		},
		
		ui : {
			infosCollapsePanel : "[name=\"infoPanel\"]"
		},
		
		// setup lister for pur DOM event handling
		events : {
			"click td" : "itemSelected",
			"click [name='deleteItem']" : "onItemDelete",
		},
		
		initialize : function() {
			// add this view to Backbone.Courier
			Courier.add(this);
			this.on('itemUnselected', this.itemUnselected, this);
			this.model.on('change:displayName', this.saveChanges, this);
			// initialize Backbone.ModelBinder for dual binding
			this.modelbinder = new ModelBinder();
		},
		
		// event handler called after the view has been closed
		onClose : function() {
			this.off('itemUnselected', this.itemUnselected, this);
			this.modelbinder.unbind();
		},
		
		/**
		 * Detect changes in the model from view, save them back to server
		 */
		saveChanges : function(model, value, options){
			// model bindel tag its change from the view by setting options.changeSource
			if( options.changeSource == 'ModelBinder'){
				model.save();
			}
		},
		
		// event handler call after the view has been rendered
		onRender : function(){
			this.modelbinder.bind(this.model, this.el, {
				unit: {selector: '[name=unit]', converter: this.unitConverter},
				val: [{selector: '[name=val]'}, {selector: '[name=variance]', elAttribute:'class', converter: this.varianceConverter}],
				name: {selector: '[name=displayName]', converter: this.nameConverter},
				status: [{selector: '[name=status]',  elAttribute: 'class', converter: this.statusClassConverter},{selector: '[name=status]', converter: this.statusConverter}],
				updateTimeStamp: {selector:'[name=timeStamp]', converter: this.lastTimeStamp}
			});
		},
		
		onItemDelete : function(){
			this.spawn("itemDelete", {point: this.model});
		},
		
		itemUnselected : function(){
			if( this.$el.hasClass("active")){
				this.$el.removeClass("active");
				this.ui.infosCollapsePanel.collapse('hide');
			}
		},
		
		itemSelected : function(){
			if( this.$el.hasClass("active")){
				this.ui.infosCollapsePanel.collapse('hide');
				this.$el.removeClass("active");
				// setup view event to clear selection
				this.spawn("listItemSelected", {point: null});
			}
			else {
				//$(".listItem ").removeClass("active");
				this.trigger("siblingItem:Unselect", '', this);
				this.$el.addClass("active");
				this.ui.infosCollapsePanel.collapse('show');
				// setup view event to indicate selection
				this.spawn("listItemSelected", {point: this.model});
			}
		},
		
		varianceConverter : function(direction, value, attributeName, model) {
			if( direction == 'ModelToView'){
				if( model.previousAttributes().hasOwnProperty('val')){
					var previousVal = model.previousAttributes().val;
					if( previousVal > value) return "glyphicon glyphicon-arrow-up";
					if( previousVal < value) return "glyphicon glyphicon-arrow-down";
					else return "{display: none}";
				} else
					return "{display: none}";
			}
		},
		
		unitConverter : function(direction, value){
			if(direction == 'ModelToView'){
				var unitContract = value.getVal();
				if( unitContract.lastIndexOf("obix:Unit/") > -1){
					return unitText[unitContract.substr(unitContract.lastIndexOf('/') + 1)];
				}
			}
		},
		
		nameConverter : function(direction, value, attributeName, model){
			if( direction =='ModelToView') {
				if(model.getDisplayName() == '') return value;
				else return model.getDisplayName();
			}
		},
		
		statusClassConverter : function( direction, value) {
			if( direction == "ModelToView") {
				if( value != null) {
					var statustoLower = value.toLowerCase();
					if( statustoLower == Obix.status.DISABLED) return "glyphicon glyphicon-ban-circle";
					if( statustoLower == Obix.status.FAULT) return "glyphicon glyphicon-alert";
					if( statustoLower == Obix.status.DOWN) return "glyphicon glyphicon-warning-sign";
					if( statustoLower == Obix.status.UNAKEDALARM) return "glyphicon glyphicon-exclamation-sign";
					if( statustoLower == Obix.status.ALARM) return "glyphicon glyphicon-bell";
					if( statustoLower == Obix.status.UNACKED) return "glyphicon glyphicon-exclamation-sign";
					if( statustoLower == Obix.status.OVERRIDEN) return "glyphicon glyphicon-remove-circle";
					if( statustoLower == Obix.status.OK) return "glyphicon glyphicon-ok-circle";
				}
			}
		},
		
		statusConverter : function( direction, value) {
			if( direction == "ModelToView") {
				if( value != null) {
					var statustoLower = value.toLowerCase();
					if( statustoLower == Obix.status.DISABLED) return statusText[statustoLower];
					if( statustoLower == Obix.status.FAULT) return statusText[statustoLower];
					if( statustoLower == Obix.status.DOWN) return statusText[statustoLower];
					if( statustoLower == Obix.status.UNAKEDALARM) return statusText[statustoLower];
					if( statustoLower == Obix.status.ALARM) return statusText[statustoLower];
					if( statustoLower == Obix.status.UNACKED) return statusText[statustoLower];
					if( statustoLower == Obix.status.OVERRIDEN) return statusText[statustoLower];
					if( statustoLower == Obix.status.OK) return statusText[statustoLower];
				}
			}
		},
		
		lastTimeStamp : function(direction, value, attributeName, model ) {
			if( direction == "ModelToView") {
				var lastTimeStamp = model.get('updateTimeStamp');
				if( lastTimeStamp != null)
					return lastTimeStamp.toLocaleTimeString();
				
			}
		}
	});
	
	return PointItemView;
});
