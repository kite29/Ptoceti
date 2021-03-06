define([ 'backbone', 'marionette', 'underscore', 'jquery', 'oauth2', 'models/obix', 'mediaenquire', 'modelbinder', 'courier', 'numeral', 'moment', 'modernizr', "i18n!nls/unittext", "i18n!nls/statustext", 'bootstrap', 'jquery.enterkeyevent' ],
		function(Backbone, Marionette, _, $, oauth2, Obix, mediaEnquire, ModelBinder, Courier, Numeral, Moment, Modernizr, unitText, statusText) {
	
	var MonitoredItemView = Backbone.Marionette.Layout.extend({
		tagName: "tr",
		template: "monitoringitem",
		className: "monitoringItem listItem",
		
		templateHelpers :  {
			elemId : function() {
				return this.href.getVal().replace(/\//gi,"-");
			},
			contentEditable : function() {
				return Modernizr.contenteditable;
			},
			onXsMedia : function() {
				return this.onXsMedia;
			}
		},
		
		
		ui : {
			detailsCollapseControlElem : "[name=\"detailsCollapseControl\"]",
			infosCollapsePanel : "[name=\"infoPanel\"]"
		},
		
		regions: {
			rollupRegion : "[name=\"detailsPanel\"]"
		},
		
		// setup lister for pur DOM event handling
		events : {
			"click td" : "itemSelected",
			"click [name='deleteItem']" : "onItemDelete",
			"hidden.bs.collapse [name='detailsPanel']" : "onDetailsCollapsed",
			"show.bs.collapse [name='detailsPanel']" : "onDetailsShow",
			"shown.bs.collapse [name='detailsPanel']" : "onDetailsShown"
		},
		
		initialize : function() {
			// add this view to Backbone.Courier
			Courier.add(this);
			// initialize Backbone.ModelBinder for dual binding
			this.modelbinder = new ModelBinder();
			this.timeStampBinder = new ModelBinder();
			this.fetchHistory();
			
			this.on('itemUnselected', this.itemUnselected, this);
			this.model.getChildrens().getByName('point').on('change:displayName', this.saveChanges, this);
			
			_.bindAll(this, 'onDetailsCollapsed','onDetailsShown', 'onDetailsShow', 'enterXs','quitXs');

			this.onXsMedia = false;
			this.xsQueryHandler = {match : this.enterXs, unmatched: this.quitXs};
			mediaEnquire.registerXs(this.xsQueryHandler);
		},
		
		enterXs : function(){
			this.onXsMedia = true;
		},
		
		quitXs : function(){
			this.onXsMedia = false;
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
			this.modelbinder.bind(this.model.getChildrens().getByName('point'), this.el, {
				unit: {selector: '[name=unit]', converter: this.unitConverter},
				val: {selector: '[name=val]', converter: this.valConverter},
				status: [{selector: '[name=status]',  elAttribute: 'class', converter: this.statusClassConverter},{selector: '[name=statusText]', converter: this.statusConverter}],
				displayName: {selector: '[name=displayName]', converter: this.nameConverter}
			}, {'changeTriggers': {'': 'change', '[contenteditable]': 'enterpress'}}  );
			
			this.timeStampBinder.bind(this.model, this.el, {
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
		
		valConverter : function(direction, value, attributeName, model) {
			if(direction == 'ModelToView'){
				return Numeral( new Number(value)).format('0.[00]a');
			}
		},
		
		
		unitConverter : function(direction, value){
			if(direction == 'ModelToView' && !!value){
				var unitContract = value.getVal();
				if( unitContract.lastIndexOf("obix:Unit/") > -1){
					return unitText[unitContract.substr(unitContract.lastIndexOf('/') + 1)];
				}
			}
		},
		
		nameConverter : function(direction, value, attributeName, model){
			if( direction =='ModelToView') {
				if(value == '' || value == null ) return model.getName();
				else return value;
			} else {
				return value;
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
		
		/**
		 * Handler to retrieve history model from href present in monitoredpoint model.
		 * 
		 */
		fetchHistory : function() {
		 var historyRef = this.model.getChildrens().getByName('historyRef');
			if( !!historyRef){
				 var history = new Obix.history({href : historyRef.getHref()}, {urlRoot : this.model.urlRoot});
				 history.fetch({
					 headers: oauth2.getAuthorizationHeader(),
					 success: _.bind(function(model, response) {
						 this.history = model;
					 },this)
				 },this);
			} else {
				console.log("historyRef not found");
			}
		},
		
		/**
		 * Make a request to history object link to this monitoredPoint to get a rollup of data for the last 24 hours. On success
		 * triger a update of the rollup data view.
		 */
		onChangeValHistory : function() {
			
			if( this.history){
				var rollUpIn = new Obix.historyRollupIn();
				rollUpIn.getLimit().setVal(24);
				
				var now = Moment();
				now.millisecond(0);
				
				// keep track of current hours
				var end = _.isUndefined(this.upperLimit) ? Moment(now) : now.isAfter(this.upperLimit) ? Moment(now) : this.upperLimit;
				end.minute(59);
				end.second(59);
				end.millisecond(0);
				
				// fisrt resquest 24 hours, after only 1 hours
				var start = _.isUndefined(this.lowerLimit) ? Moment(end).subtract(23,'hours') : Moment(end);
				// ask for plain hours
				start.minute(0);
				start.second(0);
				start.millisecond(0);
				
				//keep track of markers
				this.lowerLimit = start; this.upperLimit = end;
					
				rollUpIn.getStart().setVal(start.toISOString());
				rollUpIn.getEnd().setVal(end.toISOString());
				rollUpIn.getInterval().setVal( Moment.duration(1,'hours').toIsoString());
				
				console.log('request history rollup');
				
				this.history.getRollupOp().invoke(rollUpIn, new Obix.historyRollupOut(), {
					headers: oauth2.getAuthorizationHeader(),
					success : _.bind( this.historyRollUpUpdate, this )
				});
			}
		},
		
		/**
		 * Prepare data obtaine from history rollup to be display. Add unit to min and max, create rollup region if not
		 * already existant and update with fresh data if already there.
		 */
		historyRollUpUpdate : function(historyRollupOut, response, options) {
			var region = this.rollupRegion;
			
			_.each(historyRollupOut.getData().getChildrens().models, function(historyRecord, index, list) {
				historyRecord.getMin().setUnit(this.model.getChildrens().getByName('point').getUnit());
				historyRecord.getMax().setUnit(this.model.getChildrens().getByName('point').getUnit());
			}, this);
			
			
			require(['views/historyrollupview'], function(HistoryRollUpView){
				if( region.currentView == null){
					region.show(new HistoryRollUpView({collection: historyRollupOut.getData().getChildrens()}));
				} else {
					region.currentView.updateItemValues(historyRollupOut.getData().getChildrens());
				} 
			});
			
		},
		
		
		// event handler called after the view has been closed
		onClose : function() {
			this.modelbinder.unbind();
			this.timeStampBinder.unbind();
			this.off('itemUnselected', this.itemUnselected, this);
			this.stopListening(this.model.getChildrens().getByName('point'), "change:val", this.onChangeValHistory);
			mediaEnquire.unregisterXs(this.xsQueryHandler);
		},
		
		
		/**
		 * Event handler called once the detail panel has fully collapse
		 */
		onDetailsCollapsed : function() {
			this.ui.detailsCollapseControlElem.removeClass('glyphicon-menu-up');
			this.ui.detailsCollapseControlElem.addClass('glyphicon-menu-down');
			
			// on close, stop listening for value change to avoid requesting update of history, theses are costly.
			this.stopListening(this.model.getChildrens().getByName('point'), "change:val", this.onChangeValHistory);
		},
		
		/**
		 * Event handler called immediately after the show method on the details panel has been called.
		 */
		onDetailsShow : function() {
			// triggger initial loading of rollup history
			this.onChangeValHistory();
		},
		
		/**
		 * Event handler called once the details panel is fully shown
		 */
		onDetailsShown : function() {
			this.ui.detailsCollapseControlElem.removeClass('glyphicon-chevron-down');
			this.ui.detailsCollapseControlElem.addClass('glyphicon-chevron-up');
			
			// register a event handler to get refreshes of the rollup data
			this.model.getChildrens().getByName('point').on("change:val", this.onChangeValHistory,this);
		},
		
		
		
		
		
		lastTimeStamp : function(direction, value, attributeName, model ) {
			if( direction == "ModelToView") {
				var lastTimeStamp = model.get('updateTimeStamp');
				if( lastTimeStamp != null)
					return lastTimeStamp.toLocaleTimeString();
				
			}
		}
	});
	
	return MonitoredItemView;
});
