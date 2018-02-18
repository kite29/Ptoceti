import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs/Subscription';

import { Obj, Ref, History, HistoryRollupRecord, SearchOut, Status, Contract, Uri } from '../obix/obix';

import { HistoryAction, HistoryRollupAction, HistoriesService,  } from '../obix/obix.historiesservice';

import { Action } from '../obix/obix.services-commons';

import { LineChartDataList, MultiLineChartComponent } from '../d3/d3-multiline-chart.component';
import { LineChartData } from '../d3/d3-line-chart.component';

import * as moment from 'moment'

// range type object used in the select range combo
export class RangeType {
    id : number;
    name : string;
    code : string;
    constructor(id:number, name:string, code: string) {
        this.id = id;
        this.name = name;
        this.code = code
    }
}

export class DataType {
    id : number;
    name : string;
    code : string;
    constructor(id:number, name:string, code: string) {
        this.id = id;
        this.name = name;
        this.code = code
    }
}

@Component( {
    templateUrl: 'histories.component.html'
} )
export class HistoriesComponent implements OnInit, AfterViewInit {
    
    // datas attribute for the date range picker.
    bsRangeValue: Array<Date> = [new Date(2017, 7, 4), new Date(2017, 7, 20)];
    bsRangeMaxValue = new Date();
    bsRangeDisabled : boolean = true;
    
    rangeTypes = [
        new RangeType(1, "Last 24 hours", "24"),
        new RangeType(2, "Today", "DAY"),
        new RangeType(3, "Yesterday","YESTERDAY"),
        new RangeType(4, "Week","WEEK"),
        new RangeType(5, "Month","MONTH"),
        new RangeType(6, "Year","YEAR"),
        new RangeType(7, "Custom","CUSTOM")
    ];
    selectRange: RangeType;
    
    dataTypes = [
        new DataType(1,"Average", "AVG"),
        new DataType(2,"Max","MAX"),
        new DataType(3,"Min","MIN")
    ];
    selectData: DataType;
    
    // the history service for all interaction with back end
    historiesService: HistoriesService;
    
    historyStreamSubscription: Subscription;
    
    historyRollupStreamSubscription : Subscription;

    // the list of histories in the main list
    historyList: Array<History> = new Array<History>();
    // the list of histories shown in the multi line chart
    historyShownList: Array<History> = new Array<History>();

    // the D3 component for displaying histories
    @ViewChild( '#d3multilineChart' )
    d3LineChart: MultiLineChartComponent;
    // the array for chart data for eachhistories
    chartDataList: Array<LineChartDataList> = [];

    //contract used to indicate to search which objects to search for.
    contractFilter: Contract;

    constructor( historiesService: HistoriesService ) {
        this.historiesService = historiesService;
        this.contractFilter = new Contract( [new Uri( "obix:History" )] );
        
        this.selectRange = this.rangeTypes[0];
        this.selectData = this.dataTypes[0];
        this.updateDateRangeValues();

    }

    ngOnInit() {

        // subscribe to publication of histories
        this.historyStreamSubscription = this.historiesService.getHistoryStream().subscribe( historyAction => {
            if ( historyAction.action == Action.Add ) {
                this.historyList.push( historyAction.history );
            } else if ( historyAction.action == Action.Delete ) {
                let elemIndex = this.historyList.findIndex( elem => elem.href.val == historyAction.history.href.val );
                if ( elemIndex > -1 ) {
                    this.historyList.splice( elemIndex, 1 );

                }
            } else if ( historyAction.action == Action.Reset ) {
                this.historyList.splice( 0, this.historyList.length );
            } else if ( historyAction.action == Action.Update ) {
                let elemIndex = this.historyList.findIndex( elem => elem.href.val == historyAction.history.href.val );
                if ( elemIndex > -1 ) {
                    this.historyList[elemIndex] = historyAction.history;

                }
            }
        } )
        
        this.historyRollupStreamSubscription = this.historiesService.getHistoryRollupStream().subscribe (historyRollupAction => {
            if( historyRollupAction.action == Action.Add || historyRollupAction.action == Action.Update) {
                    let newChartData : Array<LineChartData> = [];
                    for( let record of historyRollupAction.historyRollupRecords){
                        //this.lineChartData.splice(0, this.lineChartData.length)
                        let val:any 
                        
                        if( this.selectData == this.dataTypes[0]){
                            // average
                            val = record.getAvg().val;
                        } else if( this.selectData == this.dataTypes[1]){
                            // max
                            val = record.getMax().val;
                        } else if( this.selectData == this.dataTypes[0]){
                            // min
                            val = record.getMin().val;
                        }
                    
                        newChartData.push( new LineChartData( val, new Date(record.getStart().val)));
                    }
                    
                    let list: LineChartDataList = new LineChartDataList(historyRollupAction.history.displayName);
                    list.values = newChartData;
                    
                    let newChartDataList = new Array<LineChartDataList>();
                    this.chartDataList.forEach(elem =>  {if( elem.name != list.name){newChartDataList.push(elem)}});
                    newChartDataList.push(list);
                    
                    this.chartDataList = newChartDataList;
                
            } else if( historyRollupAction.action == Action.Delete ){
                let newChartDataList = new Array<LineChartDataList>();
                this.chartDataList.forEach(elem =>  {if( elem.name != historyRollupAction.history.displayName){newChartDataList.push(elem)}});
                
                this.chartDataList = newChartDataList;
            }
        });

    }

    ngOnDestroy() {
        if ( this.historyStreamSubscription ) {
            this.historyStreamSubscription.unsubscribe();
        }
        
        if( this.historyRollupStreamSubscription ) {
            this.historyRollupStreamSubscription.unsubscribe();
        }
    }

    ngAfterViewInit() {
        this.historiesService.getHistoriesList();
    }


    onAdd( ref: Ref ) {

    }

    onRefresh() {
        this.historiesService.refreshHistoryList();
    }

    onCreate() {

    }

    onDelete( history: History ) {

    }

    onRemove( history: History ) {

    }

    onSave( history: History ) {

    }

   /**
    * Event handler for change in the date range selection
    * @param $event
    */
    changeRange($event){
        this.updateDateRangeValues();
        
        for( let history of this.historyShownList){
            let historyRef : Ref = new Ref();
            historyRef.href = history.href;
            this.historiesService.refreshNamedHistoryRollup(historyRef, this.bsRangeValue[0], this.bsRangeValue[1],this.selectRange.code);
        }
    }
    
    /**
     * Event handler for when the type range select box has changed its value.
     * 
     * @param $event
     */
    changedRangeType($event) {
        if( this.selectRange == this.rangeTypes[6]){
            this.bsRangeDisabled = false;
        } else {
            this.bsRangeDisabled = true;
        }
        
        this.updateDateRangeValues();
        
        for( let history of this.historyShownList){
            let historyRef : Ref = new Ref();
            historyRef.href = history.href;
            this.historiesService.refreshNamedHistoryRollup(historyRef, this.bsRangeValue[0], this.bsRangeValue[1], this.selectRange.code);
        }
    }
    
    /**
     * Event handler for when the type range select box has changed its value.
     * 
     * @param $event
     */
    changedDataType($event) {
        
        this.updateDateRangeValues();
        
        for( let history of this.historyShownList){
            let historyRef : Ref = new Ref();
            historyRef.href = history.href;
            this.historiesService.refreshNamedHistoryRollup(historyRef, this.bsRangeValue[0], this.bsRangeValue[1], this.selectRange.code);
        }
    }
    
    /**
     * Update start and end date displayed by the date range picker according to type of range choosen.
     * 
     */
    updateDateRangeValues() {
        
        let end =  moment().millisecond(0);  
        let start = moment(end).subtract(24,'hours').minute(0).second(0).millisecond(0);
        
        if( this.selectRange == this.rangeTypes[0]){
            // Last 24 hours
            start = moment(end).subtract(24,'hours').minute(0).second(0).millisecond(0);
        } else if(this.selectRange == this.rangeTypes[1]){
            //Today
            start = moment().startOf('day');
            end = moment().endOf('day');
        } else if(this.selectRange == this.rangeTypes[2]){
            //Yesterday
            start = moment().subtract(24,'hours').startOf('day');
            end = moment().subtract(24,'hours').endOf('day');
        } else if(this.selectRange == this.rangeTypes[3]){
            // Week
            start = moment().startOf('week');
            end = moment().endOf('week');
        } else if(this.selectRange == this.rangeTypes[4]){
            // Month
            start = moment().startOf('month');
            end = moment().endOf('month');
        } else if(this.selectRange == this.rangeTypes[5]){
            // Year
            start = moment().startOf('year');
            end = moment().endOf('year');
        } else if(this.selectRange == this.rangeTypes[6]){
            // custom
            start = moment(this.bsRangeValue[0]);
            end = moment(this.bsRangeValue[1]);
        } 
        
        this.bsRangeValue = [start.toDate(), end.toDate()];
    }
    
    /**
     * Test method to check if an history is displayed in the multi line chart
     * 
     * @param history
     */
    isHistoryShown( history: History ) {
        let elemIndex = this.historyShownList.findIndex( elem => elem.href.val == history.href.val );
        if ( elemIndex > -1 ) return true; else return false;
    };

    /**
     * Add history to list shown in the multi line chart
     * 
     * @param history
     */
    onShow( history: History ) {
        let elemIndex = this.historyShownList.findIndex( elem => elem.href.val == history.href.val );
        if ( elemIndex < 0 ) {
            // history pas dans la liste on ajoute
            this.historyShownList.push( history );
            
            let historyRef : Ref = new Ref();
            historyRef.href = history.href;
            
            this.historiesService.refreshNamedHistoryRollup(historyRef, this.bsRangeValue[0], this.bsRangeValue[1],this.selectRange.code);
        }
    }

    /**
     * Remove an history from the list shown in the multi-line chart.
     * 
     * @param history
     */
    onHide( history: History ) {
        let elemIndex = this.historyShownList.findIndex( elem => elem.href.val == history.href.val );
        if ( elemIndex > -1 ) {
            let historyToHide = this.historyShownList[elemIndex];
            // history dans la liste on supprime
            this.historyShownList.splice( elemIndex, 1 );
            
            let historyRef : Ref = new Ref();
            historyRef.href = history.href;
            this.historiesService.hideHistoryRollup(historyRef);
        }
    }

}