import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import {
  Subject,
  Subscription,
  catchError,
  finalize,
  first,
  of,
  switchMap,
  takeUntil,
  timer,
} from 'rxjs';
import { WifiNetwork } from 'src/app/generated/models';
import { DialogService } from 'src/app/services/dialog.service';
import { LiveDataService } from 'src/app/services/live-data.service';
import { LoadingService } from 'src/app/services/loading.service';
import { SystemApiService } from 'src/app/services/system.service';
import { getHttpErrorMessage } from 'src/app/utils/error-handler';
import { isValidBitcoinAddress } from 'src/app/utils/btc-address.util';

/** Bitmern Solo — host/port match stock pool NVS fields (no stratum+tcp:// prefix). */
export const BITMERN_SOLO_URL = 'btc.bitmernsolo.com';
/** Primary stratum port (Giannis Phase 2 Developer Guide STEP 3). */
export const BITMERN_SOLO_PORT = 3132;
/** Fallback / secondary stratum port. */
export const BITMERN_SOLO_FALLBACK_PORT = 3122;

type WizardStep = 1 | 2 | 3;

@Component({
  selector: 'app-onboarding-wizard',
  templateUrl: './onboarding-wizard.component.html',
  styleUrls: ['./onboarding-wizard.component.scss'],
  standalone: false,
})
export class OnboardingWizardComponent implements OnInit, OnDestroy {
  public step: WizardStep = 1;
  public wifiForm!: FormGroup;
  public walletForm!: FormGroup;

  public scanning = false;
  public showWifiPassword = false;
  public showPoolPassword = false;
  public showAdvancedPool = false;
  public emptyPasswordFlag = false;
  public saving = false;
  public connecting = false;
  public saveError = '';

  public minerIp = '';
  public minerHostname = '';
  public minerUrl = '';
  public hostnameUrl = '';
  public usingBitmernSolo = true;

  private destroy$ = new Subject<void>();
  private pollSub?: Subscription;
  private primaryPoolIndex = 0;
  private secondaryPoolIndex = 1;
  private existingPools: any[] = [];
  private defaultWorker = 'bitmern';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private systemService: SystemApiService,
    private liveDataService: LiveDataService,
    private loadingService: LoadingService,
    private dialogService: DialogService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.wifiForm = this.fb.group({
      ssid: ['', [Validators.required, Validators.maxLength(32)]],
      wifiPass: [''],
    });

    this.walletForm = this.fb.group({
      wallet: ['', [Validators.required, this.btcAddressValidator]],
      worker: [''],
      stratumURL: [BITMERN_SOLO_URL, [Validators.required]],
      stratumPort: [
        BITMERN_SOLO_PORT,
        [Validators.required, Validators.min(0), Validators.max(65535)],
      ],
      stratumPassword: ['x'],
      stratumSuggestedDifficulty: [0],
      stratumExtranonceSubscribe: [false],
      stratumTLS: [0],
    });

    this.wifiForm
      .get('wifiPass')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value: string) => {
        this.emptyPasswordFlag = !value || value.length === 0;
      });
    this.emptyPasswordFlag = true;

    this.liveDataService.info$
      .pipe(first(), this.loadingService.lockUIUntilComplete())
      .subscribe({
        next: (info) => {
          this.minerHostname = info.hostname || '';
          this.defaultWorker = (info.hostname || 'bitmern').replace(
            /[^a-zA-Z0-9_-]/g,
            ''
          ) || 'bitmern';
          this.primaryPoolIndex = info.primaryPoolIndex ?? 0;
          this.secondaryPoolIndex = info.secondaryPoolIndex ?? 1;
          this.existingPools = [...(info.pools || [])];

          if (info.ssid) {
            this.wifiForm.patchValue({ ssid: info.ssid });
          }
        },
        error: () => {
          /* wizard still usable with defaults */
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.pollSub?.unsubscribe();
  }

  private btcAddressValidator = (control: { value: string }) => {
    const value = (control.value || '').trim();
    if (!value) {
      return { required: true };
    }
    return isValidBitcoinAddress(value) ? null : { invalidBtcAddress: true };
  };

  get walletValid(): boolean {
    return !!this.walletForm.get('wallet')?.valid;
  }

  get wifiValid(): boolean {
    const ssid = (this.wifiForm.get('ssid')?.value || '').trim();
    return ssid.length > 0 && ssid.length <= 32;
  }

  get isBitmernSoloPreset(): boolean {
    const url = (this.walletForm.get('stratumURL')?.value || '').trim();
    const port = Number(this.walletForm.get('stratumPort')?.value);
    return url === BITMERN_SOLO_URL && port === BITMERN_SOLO_PORT;
  }

  goToStep(step: WizardStep): void {
    if (step === 2 && !this.wifiValid) {
      this.wifiForm.markAllAsTouched();
      return;
    }
    if (step === 3 && !this.walletValid) {
      this.walletForm.markAllAsTouched();
      return;
    }
    this.step = step;
  }

  toggleWifiPasswordVisibility(): void {
    this.showWifiPassword = !this.showWifiPassword;
  }

  togglePoolPasswordVisibility(): void {
    this.showPoolPassword = !this.showPoolPassword;
  }

  toggleAdvancedPool(): void {
    this.showAdvancedPool = !this.showAdvancedPool;
  }

  scanWifi(): void {
    this.scanning = true;
    this.http
      .get<{ networks: WifiNetwork[] }>('/api/system/wifi/scan')
      .pipe(finalize(() => (this.scanning = false)))
      .subscribe({
        next: (response) => {
          const networks = response.networks.sort((a, b) => b.rssi - a.rssi);
          const poorNetworks = networks.filter((network) => network.rssi >= -80);
          const uniqueNetworks = poorNetworks.reduce(
            (acc, network) => {
              if (!acc[network.ssid] || acc[network.ssid].rssi < network.rssi) {
                acc[network.ssid] = network;
              }
              return acc;
            },
            {} as { [key: string]: WifiNetwork }
          );
          const filteredNetworks = Object.values(uniqueNetworks);
          const dialogData = filteredNetworks.map((n) => ({
            label: n.ssid,
            rssi: n.rssi,
            value: n.ssid,
          }));

          this.dialogService
            .open('Select Wi-Fi Network', dialogData)
            .subscribe((selectedSsid: string) => {
              if (selectedSsid) {
                this.wifiForm.patchValue({ ssid: selectedSsid });
                this.wifiForm.get('ssid')?.markAsDirty();
              }
            });
        },
        error: () => {
          this.toastr.error('Failed to scan Wi-Fi networks');
        },
      });
  }

  finishSetup(): void {
    if (!this.wifiValid || !this.walletValid) {
      this.wifiForm.markAllAsTouched();
      this.walletForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.saveError = '';
    this.step = 3;
    this.connecting = false;

    const ssid = (this.wifiForm.get('ssid')?.value || '').trim();
    let wifiPass = this.wifiForm.get('wifiPass')?.value;
    wifiPass = wifiPass == null ? '' : wifiPass;

    const wallet = (this.walletForm.get('wallet')?.value || '').trim();
    const workerRaw = (this.walletForm.get('worker')?.value || '').trim();
    const worker = workerRaw || this.defaultWorker;
    const stratumUser = `${wallet}.${worker}`;

    let stratumURL = (this.walletForm.get('stratumURL')?.value || '').trim();
    let stratumPort = Number(this.walletForm.get('stratumPort')?.value) || BITMERN_SOLO_PORT;
    let stratumPassword = this.walletForm.get('stratumPassword')?.value ?? 'x';
    const stratumSuggestedDifficulty =
      Number(this.walletForm.get('stratumSuggestedDifficulty')?.value) || 0;
    const stratumExtranonceSubscribe =
      !!this.walletForm.get('stratumExtranonceSubscribe')?.value;
    let stratumTLS = Number(this.walletForm.get('stratumTLS')?.value) || 0;

    // Mirror pool.component onUrlChange: strip stratum+tcp:// and :port
    const prefixes = [
      { prefix: 'stratum+tcp://', tlsMode: 0 },
      { prefix: 'stratum+tls://', tlsMode: 1 },
      { prefix: 'stratum+ssl://', tlsMode: 1 },
    ] as const;
    const matched = prefixes.find(({ prefix }) => stratumURL.startsWith(prefix));
    if (matched) {
      stratumURL = stratumURL.slice(matched.prefix.length);
      stratumTLS = matched.tlsMode;
    }
    const portMatch = stratumURL.match(/:(\d{1,5})$/);
    if (portMatch) {
      stratumPort = parseInt(portMatch[1], 10);
      stratumURL = stratumURL.slice(0, portMatch.index);
    }

    this.usingBitmernSolo =
      stratumURL === BITMERN_SOLO_URL &&
      (stratumPort === BITMERN_SOLO_PORT ||
        stratumPort === BITMERN_SOLO_FALLBACK_PORT);

    const primaryPool = this.buildPrimaryPoolUpdate({
      stratumURL,
      stratumPort,
      stratumUser,
      stratumPassword: stratumPassword === '*****' ? 'x' : stratumPassword || 'x',
      stratumSuggestedDifficulty,
      stratumExtranonceSubscribe,
      stratumTLS,
    });

    const wifiUpdate: Record<string, string> = { ssid };
    if (wifiPass !== '*****') {
      wifiUpdate['wifiPass'] = wifiPass;
    }

    // Wi-Fi first (same API as network-edit), then pool (same shape as pool.component)
    this.systemService
      .updateSystem('', wifiUpdate)
      .pipe(
        switchMap(() =>
          this.systemService.updateSystem('', {
            primaryPoolIndex: this.primaryPoolIndex,
            secondaryPoolIndex: this.secondaryPoolIndex,
            pools: primaryPool,
          })
        ),
        switchMap(() => this.systemService.restart('')),
        catchError((err: HttpErrorResponse) => {
          this.saveError = getHttpErrorMessage(err, '');
          this.saving = false;
          this.toastr.error(`Setup failed. ${this.saveError}`);
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((result) => {
        if (result === null) {
          return;
        }
        this.saving = false;
        this.connecting = true;
        this.toastr.success('Settings saved — restarting miner…');
        this.startIpPolling();
      });
  }

  private buildPrimaryPoolUpdate(fields: {
    stratumURL: string;
    stratumPort: number;
    stratumUser: string;
    stratumPassword: string;
    stratumSuggestedDifficulty: number;
    stratumExtranonceSubscribe: boolean;
    stratumTLS: number;
  }): any[] {
    const pools = this.existingPools.map((p) => ({ ...p }));
    const idx = pools.findIndex((p) => p.id === this.primaryPoolIndex);

    const updated = {
      id: this.primaryPoolIndex,
      stratumProtocol: 'SV1',
      stratumURL: fields.stratumURL,
      stratumPort: fields.stratumPort,
      stratumUser: fields.stratumUser,
      stratumPassword: fields.stratumPassword,
      stratumSuggestedDifficulty: fields.stratumSuggestedDifficulty,
      stratumExtranonceSubscribe: fields.stratumExtranonceSubscribe,
      stratumTLS: fields.stratumTLS,
      stratumCert: '',
      stratumDecodeCoinbase: true,
      stratumV2ChannelType: 'extended',
      stratumV2AuthorityPubkey: '',
      stratumV2RequireAuth: false,
    };

    if (idx >= 0) {
      pools[idx] = { ...pools[idx], ...updated };
    } else {
      pools.push(updated);
    }

    // Secondary / fallback: Bitmern Solo :3122 when primary is Bitmern Solo (Guide STEP 3)
    const useBitmernFallback =
      fields.stratumURL === BITMERN_SOLO_URL &&
      (fields.stratumPort === BITMERN_SOLO_PORT ||
        fields.stratumPort === BITMERN_SOLO_FALLBACK_PORT);

    const secondaryBase = {
      id: this.secondaryPoolIndex,
      stratumProtocol: 'SV1',
      stratumURL: useBitmernFallback ? BITMERN_SOLO_URL : '',
      stratumPort: useBitmernFallback ? BITMERN_SOLO_FALLBACK_PORT : 3333,
      stratumUser: useBitmernFallback ? fields.stratumUser : '',
      stratumPassword: useBitmernFallback ? fields.stratumPassword : 'x',
      stratumSuggestedDifficulty: useBitmernFallback
        ? fields.stratumSuggestedDifficulty
        : 0,
      stratumExtranonceSubscribe: useBitmernFallback
        ? fields.stratumExtranonceSubscribe
        : false,
      stratumTLS: useBitmernFallback ? fields.stratumTLS : 0,
      stratumCert: '',
      stratumDecodeCoinbase: true,
      stratumV2ChannelType: 'extended',
      stratumV2AuthorityPubkey: '',
      stratumV2RequireAuth: false,
    };

    const secIdx = pools.findIndex((p) => p.id === this.secondaryPoolIndex);
    if (useBitmernFallback) {
      if (secIdx >= 0) {
        pools[secIdx] = { ...pools[secIdx], ...secondaryBase };
      } else {
        pools.push(secondaryBase);
      }
    } else if (secIdx < 0) {
      const existingSec = this.existingPools.find(
        (p) => p.id === this.secondaryPoolIndex
      );
      pools.push(existingSec || secondaryBase);
    }

    return pools;
  }

  private startIpPolling(): void {
    this.pollSub?.unsubscribe();
    const hostname = this.minerHostname;
    const candidates = [
      '', // current origin (if still reachable)
      hostname ? `http://${hostname}.local` : '',
    ].filter((u, i, arr) => arr.indexOf(u) === i);

    let attempts = 0;
    const maxAttempts = 45; // ~90s at 2s interval

    this.pollSub = timer(3000, 2000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        attempts++;
        if (attempts > maxAttempts) {
          this.pollSub?.unsubscribe();
          // Still show success UI with hostname hint even if IP unknown
          if (!this.minerIp && hostname) {
            this.hostnameUrl = `http://${hostname}.local`;
            this.minerUrl = this.hostnameUrl;
          }
          this.connecting = false;
          return;
        }

        for (const base of candidates) {
          this.systemService
            .getInfo(base)
            .pipe(
              first(),
              catchError(() => of(null))
            )
            .subscribe((info) => {
              if (!info) {
                return;
              }
              // Prefer station IP once AP mode is off
              const ip = (info as any).ipv4 || '';
              const apEnabled = !!(info as any).apEnabled;
              if (!apEnabled && ip && ip !== '0.0.0.0' && !ip.startsWith('192.168.4.')) {
                this.minerIp = ip;
                this.minerUrl = `http://${ip}`;
                this.minerHostname = info.hostname || hostname;
                if (this.minerHostname) {
                  this.hostnameUrl = `http://${this.minerHostname}.local`;
                }
                this.connecting = false;
                this.pollSub?.unsubscribe();
              }
            });
        }
      });
  }

  openMiner(): void {
    if (this.minerUrl) {
      window.location.href = this.minerUrl;
    }
  }
}
