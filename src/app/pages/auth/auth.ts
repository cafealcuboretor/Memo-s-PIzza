import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccountsService, apiErrorMessage } from '../../services/accounts';
import { TermsContent } from '../../shared/terms-content/terms-content';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TermsContent],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class Auth {
  private readonly accounts = inject(AccountsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  isLoginMode = true;
  loginEmail = '';
  loginPassword = '';
  loginError = '';
  loginSuccess = '';
  regName = '';
  regEmail = '';
  regPassword = '';
  regConfirmPassword = '';
  regError = '';
  showTermsModal = false;
  acceptedTerms = false;
  pendingAction: 'register' | 'login' = 'register';
  modalError = '';
  isSavingTerms = false;
  isLoggingIn = false;

  switchMode(login: boolean): void {
    if (this.isLoggingIn || this.isSavingTerms) return;
    this.isLoginMode = login;
    this.loginError = '';
    this.loginSuccess = '';
    this.loginPassword = '';
    this.regError = '';
    this.regPassword = '';
    this.regConfirmPassword = '';
    this.closeTermsModal();
  }

  onRegister(): void {
    this.regError = '';
    if (!this.regName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.regEmail.trim())) {
      this.regError = 'Escribe tu nombre y un correo válido.';
      return;
    }
    if (this.regPassword.length < 12) {
      this.regError = 'La contraseña debe tener al menos 12 caracteres.';
      return;
    }
    if (this.regPassword !== this.regConfirmPassword) {
      this.regError = 'Las contraseñas no coinciden.';
      return;
    }
    this.pendingAction = 'register';
    this.showTermsModal = true;
  }

  async onLogin(): Promise<void> {
    if (this.isLoggingIn) return;
    this.loginSuccess = '';
    this.loginError = '';
    if (!this.loginEmail.trim() || !this.loginPassword) {
      this.loginError = 'Ingresa tu correo y contraseña.';
      return;
    }
    this.isLoggingIn = true;
    try {
      await this.accounts.login(this.loginEmail, this.loginPassword);
      this.finishLogin();
    } catch (cause) {
      if (cause instanceof HttpErrorResponse && cause.error?.code === 'TERMS_REQUIRED') {
        this.pendingAction = 'login';
        this.showTermsModal = true;
      } else {
        this.loginError = apiErrorMessage(cause, 'No se pudo iniciar sesión. Intenta de nuevo.');
      }
    } finally {
      this.isLoggingIn = false;
      this.cdr.markForCheck();
    }
  }

  closeTermsModal(): void {
    if (this.isSavingTerms) return;
    this.showTermsModal = false;
    this.acceptedTerms = false;
    this.modalError = '';
    if (this.pendingAction === 'login') this.loginPassword = '';
  }

  async acceptAndContinue(): Promise<void> {
    if (!this.showTermsModal || !this.acceptedTerms || this.isSavingTerms) return;
    this.isSavingTerms = true;
    this.modalError = '';
    try {
      if (this.pendingAction === 'register') {
        await this.accounts.register(this.regName, this.regEmail, this.regPassword);
        this.isLoginMode = true;
        this.loginEmail = this.regEmail.trim();
        this.loginPassword = '';
        this.loginSuccess = '¡Te has registrado correctamente! Ahora inicia sesión.';
        this.regName = '';
        this.regEmail = '';
        this.regPassword = '';
        this.regConfirmPassword = '';
      } else {
        await this.accounts.login(this.loginEmail, this.loginPassword, true);
        this.finishLogin();
      }
      this.showTermsModal = false;
      this.acceptedTerms = false;
    } catch (cause) {
      this.modalError = apiErrorMessage(cause, 'No se pudo guardar la aceptación. Intenta de nuevo.');
    } finally {
      this.isSavingTerms = false;
      this.cdr.markForCheck();
    }
  }

  private finishLogin(): void {
    this.loginPassword = '';
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '';
    const allowed = ['/carrito', '/mis-pedidos', '/ajustes', '/admin/pedidos'];
    void this.router.navigateByUrl(allowed.includes(returnUrl) ? returnUrl : '/');
  }
}
