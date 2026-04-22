declare global {
  namespace App {
    interface Locals {
      userId?: string;
      storeId?: string;
      userRole?: string;
      superAdminId?: string;
      csrfToken?: string;
    }
    // interface Error {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};