import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({selector:'app-legal', standalone:true, imports:[CommonModule,RouterLink], templateUrl:'./legal.html'})
export class Legal {
  constructor(public route: ActivatedRoute) {}
  openCookiePreferences(): void { if (typeof window !== 'undefined') window.dispatchEvent(new Event('memos-open-cookies')); }
  get section(): string { return this.route.snapshot.data['section'] || 'aviso'; }
}
