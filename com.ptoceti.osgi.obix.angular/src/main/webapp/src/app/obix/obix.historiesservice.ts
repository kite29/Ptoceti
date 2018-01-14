
import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';

import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/first';

import * as moment from 'moment'

import { Action } from '../obix/obix.services-commons';

import { AsyncLocalStorage } from 'angular-async-local-storage';

import { Obj, Ref, Contract, Int, Abstime, Reltime, Real, List, Uri, Nil, Op, HistoryService, HistoryRollupOut, HistoryRollupIn, HistoryRollupRecord, History } from './obix';


export class HistoryAction {
    action: Action;
    history: History;
    constructor( action: Action, history: History ) {
        this.action = action;
        this.history = history;
    }
}

@Injectable()
export class HistoriesService {
    
    static historiesListKey: string = 'historiesList'; 
    
    http: HttpClient;
    serviceUrl : string;
    rootUrl : string;
    storage: AsyncLocalStorage;
    cache : ReplaySubject<HistoryService>;
 
    historyStream: Subject<HistoryAction>;
    
    constructor( http: HttpClient, storage: AsyncLocalStorage ) {
        this.http = http;
        this.storage = storage;
        this.cache = new ReplaySubject<HistoryService>();
        this.historyStream = new Subject<HistoryAction>();
    }
    
    private handleHistoryServiceResponse(response: any ): HistoryService {
        let result : HistoryService = new HistoryService;
        result.parse(response);
        return result;
    }
    
    getHistoryService(): Observable<HistoryService>{
        return this.cache.asObservable();
    }
    
    // items from add, update and delete history item
    getWatchStream(): Observable<HistoryAction> {
        return this.historyStream.asObservable();
    }
    
    initialize( rootUrl : string, serviceUrl : string) {
       
       this.rootUrl = rootUrl;
       this.serviceUrl = serviceUrl;
       
        // check first if we already have the lobby in local storage
       this.storage.getItem(serviceUrl)
           .map( response => {if(response != null ){ let historyservice : HistoryService = new HistoryService; historyservice.parse(response);return historyservice;}})
           .subscribe((historyservice) => {
           if (historyservice != null) {
             this.cache.next(historyservice);
           } else{
               // not available, get it from backend server
               this.http.get( serviceUrl ).map( this.handleHistoryServiceResponse ).subscribe(historyservice => {
                   // and save it in local storage
                   this.storage.setItem(serviceUrl, historyservice).subscribe(() => { this.cache.next(historyservice); }, () => {});
               });
           }
         }, () => {
             console.error( 'error reading from localstorage' );
         });
           
    }
    
    /**
     * Create an history object in backend service for a given object
     * 
     * @param obj : the object for which the history is created
     */
    createHistory(obj: Obj) : Observable<HistoryAction> {

        let result: ReplaySubject<HistoryAction> = new ReplaySubject<HistoryAction>();
    
        this.getHistoryService().subscribe( historyService => {
            let makeUrl: string = historyService.getMakeOp().getUrl( this.rootUrl );
        
            let objectRef: Ref = new Ref();
            objectRef.href = obj.href;
        
            // create history on backend server
            this.http.post( this.serviceUrl, objectRef ).map( response => { let historyItem: History = new History(); historyItem.parse( response ); return historyItem; } )
                .subscribe(( history: History ) => {
                    // once created, save it in local storage
                    this.storage.setItem( history.getUrl( this.rootUrl ), history )
                        .subscribe(() => {
                            // then update watch list on local storage. First get watch list ..
                            this.storage.getItem( HistoriesService.historiesListKey )
                                .map( item => { let list: List = new List(); if ( item != null ) {list.parse( item )}; return list; } )
                                .subscribe(( list ) => {
                                    let ref: Ref = new Ref(); ref.href = new Uri( history.href.val );
                                    list.childrens.push( ref );
                                    // ... then update watch list
                                    this.storage.setItem( HistoriesService.historiesListKey, list )
                                        // and finally send watch to stream.
                                        .subscribe(() => { 
                                            let historyAction : HistoryAction = new HistoryAction( Action.Add, history );
                                            this.historyStream.next( historyAction );
                                            result.next(historyAction);
                                            result.complete();
                                        } )
                                } )
                        }, () => { console.error( 'error reading from localstorage' ) } );
                },
                (error) => {
                    result.error (error);
                })
        } )
        
        return result.asObservable();
    }
    
    /**
     * Delete a history. Delete first on backend rest server. Then delete from local storage. On success emit Action.Delete message to observers.
     * 
     * @param watchUrl path  of history
     */
    deleteHistoy( historyRef : Ref ) : Observable<HistoryAction> {

        let historyUrl = historyRef.getUrl( this.rootUrl );
        
        let result: ReplaySubject<HistoryAction> = new ReplaySubject<HistoryAction>();

        // retrieve full watch form local storage
        this.storage.getItem( historyUrl )
            .map( item => { 
                if ( item != null ) { 
                    let history: History = new History(); history.parse( item ); return history;
                 }} )
            .subscribe(( historyItem ) => {
                if ( historyItem != null ) {
                    // do the delete on backend server
                    this.http.delete( historyUrl ).map( response => { let nil: Nil = new Nil(); nil.parse( response ); return nil; } )
                        .subscribe(() => {
                            // then on success remove from local storage
                            this.storage.removeItem( historyUrl ).subscribe(() => {
                                this.storage.getItem( HistoriesService.historiesListKey  )
                                    .map( item => { let list: List = new List(); if ( item != null ) {list.parse( item )}; return list; } )
                                    .subscribe(( list ) => {

                                        let elemIndex = list.childrens.findIndex( elem => elem.href.val == historyRef.href.val );
                                        if ( elemIndex > -1 ) {
                                            list.childrens.splice( elemIndex, 1 );
                                            // ... then update watch list
                                            this.storage.setItem( HistoriesService.historiesListKey , list )
                                                // and finally send watch to stream.
                                                .subscribe(() => { 
                                                    
                                                    let historyAction : HistoryAction = new HistoryAction( Action.Delete, historyItem);
                                                    this.historyStream.next( historyAction );
                                                    result.next(historyAction);
                                                    result.complete();
                                                 } )
                                        }
                                    }, ( error ) => { console.error( 'error reading from localstorage' + error ) } )
                            }, ( error ) => { console.error( 'error reading from localstorage' + error ) } )
                        } )
                }
            }, (error) => {
                console.error( 'error reading from localstorage' );
                result.error(error);
            })
            
         return result.asObservable();
    }
    
    /**
     * Retrieve an observable on a History. The watch is first search in local storage, then from the backend rest server
     * The observable will emmit just once and then return complete. 
     * 
     * @param historyRef the ref object with history url
     */
    getHistoryByRef( historyRef : Ref) : Observable<History> {
        
        let historyUrl: string = historyRef.getUrl(this.rootUrl );
        return this.getHistory(historyUrl);
    }
    
    /**
     * Retrieve an observable on a History. The watch is first search in local storage, then from the backend rest server
     * The observable will emmit just once and then return complete.
     * 
     * @param watchUrl the  url of the watch to retrieve.
     * @returns Observable<History>
     */
    getHistory( historyUrl ): Observable<History> {

        let result: ReplaySubject<History> = new ReplaySubject<History>();

        this.storage.getItem( historyUrl )
            .map( item => { if ( item != null ) { let historyItem: History = new History(); historyItem.parse( item ); return historyItem; } } )
            .subscribe(( historyItem ) => {
                if ( historyItem != null ) {
                    result.next( historyItem );
                    result.complete();
                } else {
                    this.refreshHistory( historyUrl, result );
                }

            }, ( error ) => {
                console.log( error );
                result.error( error );
            } );

        return result.asObservable();
    }
    
    /**
     * Obtain a history from backend rest server, saves it to localstorage and informs observer
     * 
     * @param historyUrl
     */
    refreshHistory( historyUrl: string, observer: Observer<History> ) {
        this.http.get( historyUrl ).map( response => {
            let historyItem: History = new History();
            historyItem.parse( response ); return historyItem;
        } )
        .subscribe( history => {
            // and save it in local storage
            this.storage.setItem( historyUrl, history ).subscribe(() => { observer.next( history ); observer.complete(); }, () => { } );
        } )
    }
    
    /**
     * Get a rollup of history records for the last 24 hours, with rollups of 1 hour.
     * 
     * @param historyRef a ref object giving the history href
     */
    getLast24History ( historyRef : Ref ) : Observable<HistoryRollupOut> {
        
        let result: ReplaySubject<HistoryRollupOut> = new ReplaySubject<HistoryRollupOut>();
    
        this.getHistoryByRef(historyRef).subscribe((history)=>{
            let rollupOp : Op = history.getRollupOp();
            // attemp first to get it from local storage
            
            
            this.storage.getItem(rollupOp.getUrl(this.rootUrl) + '/24/')
                .map( item => { if ( item != null ) { let rollup: HistoryRollupOut = new HistoryRollupOut(); rollup.parse( item ); return rollup; }} )
                .subscribe((rollupOut) =>{
                    
                    
                    let now = moment().millisecond(0);                    
                    let end =  moment(now).add(1,'hours').minute(0).second(0).millisecond(0);
                    let start = moment(end).subtract(24,'hours').minute(0).second(0).millisecond(0);
                    
                    let startAbs : Abstime = new Abstime();
                    startAbs.val = start.toISOString();
                    let endAbs : Abstime = new Abstime();
                    endAbs.val = end.toISOString();
                    
                    let doit : any = false;
                    // already some records in local storage, use them
                    if( rollupOut !== undefined){
                    //if( doit){
                        
                        let historyRollupRecords : Array<HistoryRollupRecord> = rollupOut.getDataList().childrens as Array<HistoryRollupRecord>;
                        let discardRecords : boolean = false;
                        let lastEndRecord : moment.Moment = null;
                        let filteredRecords = historyRollupRecords.filter(( rollupRecord ) => {
                            let recordStart = moment(rollupRecord.getStart().val, moment.ISO_8601);
                            let recordEnd = moment(rollupRecord.getEnd().val, moment.ISO_8601);
                            if( lastEndRecord == null) {
                                lastEndRecord = recordEnd;
                            } else if( recordEnd.isAfter(lastEndRecord)){
                                // remember end timestap of latest record
                                lastEndRecord = recordEnd;
                            }
                            if( recordEnd.isBefore(start)){
                                // record ended before beginning of 24h period, remove it
                                discardRecords = true;
                                return false;
                            } else return true;
                        });
                        
                        
                        if(historyRollupRecords.length == 0){
                            // no records in history, try reload everything
                            let rollupIn : HistoryRollupIn = new HistoryRollupIn();
                        
                            let limit: Int = new Int(); limit.val = 24;
                            rollupIn.setLimit(limit);
                            rollupIn.setStart(startAbs);
                            rollupIn.setEnd(endAbs);
                            
                            let interval : Reltime = new Reltime();
                            interval.val = moment.duration(1,'hours').toISOString();
                            rollupIn.setInterval(interval);
                            
                            this.http.post( rollupOp.getUrl(this.rootUrl), rollupIn )
                            .map( response => { let roolupResult: HistoryRollupOut = new HistoryRollupOut(); roolupResult.parse( response ); return roolupResult; } )
                            .subscribe((roolupResult) => {
                                
                                this.storage.setItem(rollupOp.getUrl(this.rootUrl) + '/24/', roolupResult).subscribe(() => {
                                    result.next(roolupResult);
                                    result.complete();
                                }, (error) => {
                                    result.error(error);
                                })
                            }, (error) => {
                                result.error(error);
                            })
                        
                        } else if( lastEndRecord.isBefore(end, 'hour')){
                            // lacking recent one, try reload lasts records
                            start = lastEndRecord.add(1, 'hour').startOf('hour');
                            
                            let rollupIn : HistoryRollupIn = new HistoryRollupIn();
                            
                            let limit: Int = new Int(); limit.val = 24;
                            rollupIn.setLimit(limit);
                            startAbs.val = start.toISOString();
                            rollupIn.setStart(startAbs);
                            rollupIn.setEnd(endAbs);
                            
                            let interval : Reltime = new Reltime();
                            interval.val = moment.duration(1,'hours').toISOString();
                            rollupIn.setInterval(interval);
                            
                            this.http.post( rollupOp.getUrl(this.rootUrl), rollupIn )
                            .map( response => { let roolupResult: HistoryRollupOut = new HistoryRollupOut(); roolupResult.parse( response ); return roolupResult; } )
                            .subscribe((roolupResult) => {
                                
                                // server sent us some data
                                for( let rollupRecord of roolupResult.getDataList().childrens as Array<HistoryRollupRecord>){
                                    filteredRecords.push(rollupRecord);
                                }
                                
                                roolupResult.getDataList().childrens = filteredRecords;
                                roolupResult.setStart(filteredRecords[0].getStart());
                                roolupResult.setEnd(filteredRecords[filteredRecords.length -1].getEnd());
                                let count: Int = new Int();
                                count.val = filteredRecords.length;
                                roolupResult.setCount( count);
                                
                                this.storage.setItem(rollupOp.getUrl(this.rootUrl) + '/24/', roolupResult).subscribe(() => {
                                    result.next(roolupResult);
                                    result.complete();
                                }, (error) => {
                                    result.error(error);
                                })
                                
                            }, (error) => {
                                result.error(error);
                            })
                        } else if (discardRecords) {
                            // just remove old records ( more that 24 h date stamp)
                            rollupOut.getDataList().childrens = filteredRecords;
                            rollupOut.getStart().val = filteredRecords[0].getStart().val;
                            rollupOut.getEnd().val = filteredRecords[filteredRecords.length -1].getEnd().val;
                            rollupOut.getCount().val = filteredRecords.length;
                            
                            this.storage.setItem(rollupOp.getUrl(this.rootUrl) + '/24/', rollupOut).subscribe(() => {
                                result.next(rollupOut);
                                result.complete();
                            }, (error) => {
                                result.error(error);
                            })
                        } else {
                            // up to date, resent it.
                            result.next(rollupOut);
                            result.complete();
                        }
                        
                    } else {
                        // nothing in local storage, get them from backend
                        let rollupIn : HistoryRollupIn = new HistoryRollupIn();
                    
                        let limit: Int = new Int(); limit.val = 24;
                        rollupIn.setLimit(limit);
                        rollupIn.setStart(startAbs);
                        rollupIn.setEnd(endAbs);
                        
                        let interval : Reltime = new Reltime();
                        interval.val = moment.duration(1,'hours').toISOString();
                        rollupIn.setInterval(interval);
                        
                        this.http.post( rollupOp.getUrl(this.rootUrl), rollupIn )
                            .map( response => { let roolupOutFromPost: HistoryRollupOut = new HistoryRollupOut(); roolupOutFromPost.parse( response ); return roolupOutFromPost; } )
                            .subscribe((roolupOutFromPost) => {
                                this.storage.setItem(roolupOutFromPost.getUrl(this.rootUrl) + '/24/', roolupOutFromPost).subscribe(() => {
                                    result.next(roolupOutFromPost);
                                    result.complete();
                                })
                            }, (error) => {
                                result.error(error);
                            })
                    }                 
                        
            }, (error) => {
                result.error(error);
            });
   
        }, (error) => {
            result.error(error);
        });
    
        return result.asObservable();
    }
}