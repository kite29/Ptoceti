define([ 'backbone', 'marionette', 'underscore', 'jquery', 'models/obix', 'modelbinder', 'courier', 'views/baseitemview', 'i18n!nls/statetext', "i18n!nls/statustext", 'bootstrap' ], function(Backbone, Marionette, _, $, Obix, ModelBinder, Courier, BaseItemView, stateText, statusText) {
	
	var SwitchItemView = BaseItemView.extend({
		tagName: "div",
		template: "switchitem",
		className: "item",
		
		ui : {
			infosCollapsePanel : "[name=\"infoPanel\"]",
			childCollapsePanel : "[name=\"childPanel\"]",
			childCollapseControlElem : "[name=\"childCollapseControl\"]",
			childCollapseItem : "[name=\"childCollapseItem\"]",
			switchinput : "[name=\"switchinput\"]"
		},
		
		// setup lister for pur DOM event handling
		events : {
			"click [name='listItem']" : "itemSelected",
			"click [name='deleteItem']" : "onItemDelete",
			"click [name='childCollapseItem']" : "onChildCollapse",
			"hidden.bs.collapse [name='childPanel']" : "onChildCollapsed",
			"show.bs.collapse [name='childPanel']" : "onChildShow",
			"shown.bs.collapse [name='childPanel']" : "onChildShown",
			"click [name='switch']" : "switchClicked"
		},
	
		// event handler call after the view has been rendered
		onRender : function(){
			this.modelbinder.bind(this.model, this.el, {
				val: [{selector: '[name=switch]',  converter: this.valueConverter}],
				name: {selector: '[name=displayName]', converter: this.nameConverter},
				status: [{selector: '[name=status]',  elAttribute: 'class', converter: this.statusClassConverter},{selector: '[name=statusText]', converter: this.statusConverter}],
				updateTimeStamp: {selector:'[name=timeStamp]', converter: this.lastTimeStamp}
			});
			
			if( this.model.get("val") == "true"){
				this.ui.switchinput.attr('checked', true);
			}
		},
		
		switchClicked : function(event){
			this.model.save({val: this.model.get("val") == "true" ? "false" : "true" }, {
				success : this.lobbyLoaded,
				error : _.bind(function(model, response){
					console.log('Error loading lobby');
				}, this)
			})
			event.stopImmediatePropagation();
		},
		
		switchCheckedConverter : function(direction, value, attributeName, model, els){
			if( direction =='ModelToView') {
				if(value == "true"){
					return true;
				} else { return false; }
			}
		},
		
		valueConverter : function(direction, value, attributeName, model){
			if( direction =='ModelToView') {
				if(value == "true"){
					return stateText['on']; 
				} else { return stateText['off']; }
			}
		}
		
	});
	
	return SwitchItemView;
});