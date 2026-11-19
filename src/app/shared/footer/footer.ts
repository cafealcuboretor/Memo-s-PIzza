import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class Footer {
  currentYear = new Date().getFullYear();
  showCookiePreferences() {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('memos-open-cookies'));
  }
}