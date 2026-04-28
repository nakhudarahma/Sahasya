export class ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;

  constructor(success: boolean, message: string, data?: T) {
    this.success = success;
    this.message = message;
    if (data) {
      this.data = data;
    }
  }

  static success<T>(data: T, message: string = 'Success') {
    return new ApiResponse(true, message, data);
  }

  static error(message: string) {
    return new ApiResponse(false, message);
  }
}
