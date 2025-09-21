import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, AlertCircle } from 'lucide-react';

const budgetSchema = z.object({
  projectId: z.number(),
  totalBudget: z.number().positive('Total budget must be greater than 0'),
  currency: z.enum(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']).default('USD'),
  status: z.enum(['draft', 'approved', 'active', 'completed', 'overbudget', 'cancelled']).default('draft'),
  contingencyPercentage: z.number().min(0).max(100).default(10),
  notes: z.string().optional(),
  costCategories: z.record(z.object({
    budgeted: z.number().min(0),
    allocated: z.number().min(0).default(0),
    spent: z.number().min(0).default(0),
    committed: z.number().min(0).default(0)
  })).optional()
});

type BudgetFormData = z.infer<typeof budgetSchema>;

const COST_CATEGORIES = [
  { value: 'labor', label: 'Labor' },
  { value: 'materials', label: 'Materials' },
  { value: 'overhead', label: 'Overhead' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'travel', label: 'Travel' },
  { value: 'other', label: 'Other' }
];

const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' }
];

const BUDGET_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'overbudget', label: 'Over Budget' },
  { value: 'cancelled', label: 'Cancelled' }
];

interface BudgetFormProps {
  projectId: number;
  initialData?: Partial<BudgetFormData>;
  onSuccess: () => void;
  onCancel: () => void;
}

export const BudgetForm: React.FC<BudgetFormProps> = ({
  projectId,
  initialData,
  onSuccess,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [costCategories, setCostCategories] = useState<{[key: string]: {budgeted: number}}>(
    initialData?.costCategories || {
      labor: { budgeted: 0, allocated: 0, spent: 0, committed: 0 },
      overhead: { budgeted: 0, allocated: 0, spent: 0, committed: 0 }
    }
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      projectId,
      totalBudget: initialData?.totalBudget || 0,
      currency: initialData?.currency || 'USD',
      status: initialData?.status || 'draft',
      contingencyPercentage: initialData?.contingencyPercentage || 10,
      notes: initialData?.notes || '',
      costCategories: costCategories
    }
  });

  const totalBudget = watch('totalBudget');
  const contingencyPercentage = watch('contingencyPercentage');

  const calculateCategoryTotals = () => {
    return Object.values(costCategories).reduce((sum, category) => sum + category.budgeted, 0);
  };

  const addCostCategory = (categoryType: string) => {
    if (!costCategories[categoryType]) {
      const newCategories = {
        ...costCategories,
        [categoryType]: { budgeted: 0, allocated: 0, spent: 0, committed: 0 }
      };
      setCostCategories(newCategories);
      setValue('costCategories', newCategories);
    }
  };

  const removeCostCategory = (categoryType: string) => {
    const newCategories = { ...costCategories };
    delete newCategories[categoryType];
    setCostCategories(newCategories);
    setValue('costCategories', newCategories);
  };

  const updateCategoryBudget = (categoryType: string, amount: number) => {
    const newCategories = {
      ...costCategories,
      [categoryType]: {
        ...costCategories[categoryType],
        budgeted: amount
      }
    };
    setCostCategories(newCategories);
    setValue('costCategories', newCategories);
  };

  const onSubmit = async (data: BudgetFormData) => {
    try {
      setLoading(true);
      setError(null);

      const method = initialData ? 'PUT' : 'POST';
      const url = initialData 
        ? `/api/budgets/${initialData.id}` 
        : '/api/budgets';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.message || 'Failed to save budget');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const currency = watch('currency') || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getCategoryLabel = (categoryType: string) => {
    return COST_CATEGORIES.find(c => c.value === categoryType)?.label || categoryType;
  };

  const categoryTotal = calculateCategoryTotals();
  const contingencyAmount = (totalBudget * contingencyPercentage) / 100;
  const remainingBudget = totalBudget - categoryTotal;
  const isBudgetBalanced = Math.abs(remainingBudget) < 0.01;

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit Budget' : 'Create Budget'}
        </CardTitle>
        <CardDescription>
          Set up budget allocation and cost categories for the project
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="categories">Cost Categories</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="totalBudget">Total Budget *</Label>
                  <Input
                    id="totalBudget"
                    type="number"
                    step="0.01"
                    {...register('totalBudget', { valueAsNumber: true })}
                    className={errors.totalBudget ? 'border-red-500' : ''}
                  />
                  {errors.totalBudget && (
                    <p className="text-sm text-red-600 mt-1">{errors.totalBudget.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Controller
                    name="currency"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {BUDGET_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="contingencyPercentage">Contingency %</Label>
                  <Input
                    id="contingencyPercentage"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    {...register('contingencyPercentage', { valueAsNumber: true })}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Contingency amount: {formatCurrency(contingencyAmount)}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="Budget assumptions, constraints, or additional notes..."
                  className="min-h-[100px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Cost Categories</h3>
                <Select onValueChange={addCostCategory}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Add category" />
                  </SelectTrigger>
                  <SelectContent>
                    {COST_CATEGORIES.filter(cat => !costCategories[cat.value]).map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                {Object.entries(costCategories).map(([categoryType, category]) => (
                  <div key={categoryType} className="flex items-center space-x-4 p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">
                        {getCategoryLabel(categoryType)}
                      </Label>
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        step="0.01"
                        value={category.budgeted}
                        onChange={(e) => updateCategoryBudget(categoryType, parseFloat(e.target.value) || 0)}
                        placeholder="Amount"
                      />
                    </div>
                    <div className="text-sm text-gray-500 w-20 text-right">
                      {totalBudget > 0 ? `${((category.budgeted / totalBudget) * 100).toFixed(1)}%` : '0%'}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeCostCategory(categoryType)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {!isBudgetBalanced && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Category total ({formatCurrency(categoryTotal)}) {remainingBudget > 0 ? 'is less than' : 'exceeds'} 
                    the total budget ({formatCurrency(totalBudget)}). 
                    Difference: {formatCurrency(Math.abs(remainingBudget))}
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Budget Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Total Budget:</span>
                      <span className="font-medium">{formatCurrency(totalBudget)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Contingency ({contingencyPercentage}%):</span>
                      <span className="font-medium">{formatCurrency(contingencyAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Available for Categories:</span>
                      <span className="font-medium">{formatCurrency(totalBudget - contingencyAmount)}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between items-center font-medium">
                      <span>Category Allocation:</span>
                      <span>{formatCurrency(categoryTotal)}</span>
                    </div>
                  </CardContent>
                </Card>

                {Object.keys(costCategories).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Category Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(costCategories).map(([categoryType, category]) => (
                          <div key={categoryType} className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary">{getCategoryLabel(categoryType)}</Badge>
                              <span className="text-sm text-gray-500">
                                ({totalBudget > 0 ? ((category.budgeted / totalBudget) * 100).toFixed(1) : 0}%)
                              </span>
                            </div>
                            <span className="font-medium">{formatCurrency(category.budgeted)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (initialData ? 'Update Budget' : 'Create Budget')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};