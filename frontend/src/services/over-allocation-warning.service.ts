import { OverAllocationWarning } from '../types/over-allocation-warning.types';

class OverAllocationWarningService {
  private baseUrl = '/api';

  async getEmployeeWarnings(employeeId: string, startDate?: Date, endDate?: Date): Promise<OverAllocationWarning> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());

    const response = await fetch(`${this.baseUrl}/over-allocation-warnings/employee/${employeeId}?${params}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch employee warnings');
    }

    return response.json();
  }

  async getAllWarnings(startDate?: Date, endDate?: Date, employeeIds?: string[]): Promise<OverAllocationWarning[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    if (employeeIds) params.append('employeeIds', employeeIds.join(','));

    const response = await fetch(`${this.baseUrl}/over-allocation-warnings?${params}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch all warnings');
    }

    return response.json();
  }

  async getResolutionSuggestions(employeeId: string): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/over-allocation-warnings/employee/${employeeId}/suggestions`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch resolution suggestions');
    }

    return response.json();
  }

  async validateAllocation(validation: {
    employeeId: string;
    proposedHours: number;
    startDate: Date;
    endDate: Date;
  }) {
    const response = await fetch(`${this.baseUrl}/over-allocation-warnings/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...validation,
        startDate: validation.startDate.toISOString(),
        endDate: validation.endDate.toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to validate allocation');
    }

    return response.json();
  }
}

export const overAllocationWarningService = new OverAllocationWarningService();