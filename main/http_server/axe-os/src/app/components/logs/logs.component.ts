import { Component } from '@angular/core';
import { interval, map, Observable, shareReplay, startWith, switchMap } from 'rxjs';
import { SystemService } from '../../services/system.service';
import { WebsocketService } from '../../services/web-socket.service';

@Component({
  selector: 'app-logs',
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.scss']
})
export class LogsComponent {
  public logs$: Observable<string[]>;

  constructor(
    private systemService: SystemService,
    private websocketService: WebsocketService
  ) {
    this.logs$ = this.websocketService.ws$.pipe(
      startWith(null),
      switchMap(() => this.systemService.getLogs()),
      map((logs: any) => logs),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }
}
