declare global {
  namespace App {
    interface Locals {
      customerId?: string;
      storeId?: string;
      csrfToken?: string;
    }
    // interface Error {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};