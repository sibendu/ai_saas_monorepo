import { Router, Request, Response } from 'express';
import {
  Customer,
  CustomerMutationRequest,
  CustomerSearchFilters,
  CustomersResponse,
  ApiResponse,
} from '@saas/shared-types';

const router = Router();

const allowedPageSizes = [5, 10, 25];
const defaultPageSize = 10;

const companyRoots = [
  'Acme', 'TechStart', 'Global Solutions', 'Innovation Labs', 'Digital Dynamics',
  'Northstar', 'BluePeak', 'Vertex', 'Quantum', 'BrightPath', 'CloudNine',
  'SummitWorks', 'PrimeWave', 'UrbanGrid', 'NextOrbit', 'Riverstone',
  'Silverline', 'ApexBridge', 'CoreVista', 'MetroLogic', 'GreenField',
  'NovaEdge', 'Skyline', 'DataForge', 'Pioneer', 'RapidScale',
];

const suffixes = ['Corporation', 'Inc', 'Ltd', 'Systems', 'Labs', 'Partners'];
const statuses: Customer['status'][] = ['active', 'pending', 'inactive'];

let nextCustomerId = 79;

const mockCustomers: Customer[] = Array.from({ length: 78 }, (_, index) => {
  const id = index + 1;
  const companyRoot = companyRoots[index % companyRoots.length];
  const suffix = suffixes[index % suffixes.length];
  const company = `${companyRoot} ${suffix}`;
  const emailSlug = `${companyRoot}-${id}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const createdMonth = ((index % 12) + 1).toString().padStart(2, '0');
  const createdDay = ((index % 27) + 1).toString().padStart(2, '0');

  return {
    id: id.toString(),
    name: `${companyRoot} Customer ${id}`,
    email: `${emailSlug}@example.com`,
    company,
    phone: `+1-555-${(1000 + id).toString()}`,
    status: statuses[index % statuses.length],
    createdAt: `2024-${createdMonth}-${createdDay}T10:00:00Z`,
  };
});

function parsePageNumber(value: unknown): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function parsePageSize(value: unknown): number {
  const parsed = Number(value);

  return allowedPageSizes.includes(parsed) ? parsed : defaultPageSize;
}

function getSearchTerm(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getCustomerFilters(query: Request['query']): CustomerSearchFilters {
  return {
    name: getSearchTerm(query.name),
    company: getSearchTerm(query.company),
    email: getSearchTerm(query.email),
  };
}

function matchesFilter(value: string, filter: string): boolean {
  return !filter || value.toLowerCase().includes(filter.toLowerCase());
}

function isCustomerStatus(value: unknown): value is Customer['status'] {
  return value === 'active' || value === 'inactive' || value === 'pending';
}

function readCustomerMutation(body: Partial<CustomerMutationRequest>): CustomerMutationRequest | null {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const company = typeof body.company === 'string' ? body.company.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const status = body.status;

  if (!name || !email || !company || !phone || !isCustomerStatus(status)) {
    return null;
  }

  return { name, email, company, phone, status };
}

/**
 * GET /api/customers
 * Returns list of all customers
 * 
 * In production:
 * - Add pagination (page, limit)
 * - Add filtering (status, search)
 * - Add sorting
 * - Fetch from database
 */
router.get('/customers', async (req: Request, res: Response) => {
  try {
    // Simulate database delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const filters = getCustomerFilters(req.query);
    const pageSize = parsePageSize(req.query.pageSize);
    const requestedPage = parsePageNumber(req.query.page);
    const filteredCustomers = mockCustomers.filter((customer) =>
      matchesFilter(customer.name, filters.name) &&
      matchesFilter(customer.company, filters.company) &&
      matchesFilter(customer.email, filters.email)
    );
    const total = filteredCustomers.length;
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    const page = Math.min(requestedPage, totalPages);
    const startIndex = (page - 1) * pageSize;
    const customers = filteredCustomers.slice(startIndex, startIndex + pageSize);

    const response: CustomersResponse = {
      customers,
      total,
      page,
      pageSize,
      totalPages,
      filters,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customers',
    });
  }
});

router.post('/customers', async (req: Request, res: Response) => {
  try {
    const customerInput = readCustomerMutation(req.body as Partial<CustomerMutationRequest>);

    if (!customerInput) {
      return res.status(400).json({
        success: false,
        error: 'Name, company, email, phone, and status are required',
      });
    }

    const duplicateCustomer = mockCustomers.find(
      (customer) => customer.email.toLowerCase() === customerInput.email
    );

    if (duplicateCustomer) {
      return res.status(409).json({
        success: false,
        error: 'A customer with this email already exists',
      });
    }

    const customer: Customer = {
      id: (nextCustomerId++).toString(),
      ...customerInput,
      createdAt: new Date().toISOString(),
    };

    mockCustomers.unshift(customer);

    return res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created',
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create customer',
    });
  }
});

/**
 * GET /api/customers/:id
 * Returns a single customer by ID
 */
router.get('/customers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = mockCustomers.find(c => c.id === id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    const response: ApiResponse<Customer> = {
      success: true,
      data: customer,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer',
    });
  }
});

router.put('/customers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customerIndex = mockCustomers.findIndex((customer) => customer.id === id);

    if (customerIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    const customerInput = readCustomerMutation(req.body as Partial<CustomerMutationRequest>);

    if (!customerInput) {
      return res.status(400).json({
        success: false,
        error: 'Name, company, email, phone, and status are required',
      });
    }

    const duplicateCustomer = mockCustomers.find(
      (customer) => customer.id !== id && customer.email.toLowerCase() === customerInput.email
    );

    if (duplicateCustomer) {
      return res.status(409).json({
        success: false,
        error: 'A customer with this email already exists',
      });
    }

    const updatedCustomer: Customer = {
      ...mockCustomers[customerIndex],
      ...customerInput,
    };

    mockCustomers[customerIndex] = updatedCustomer;

    return res.json({
      success: true,
      data: updatedCustomer,
      message: 'Customer updated',
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update customer',
    });
  }
});

router.delete('/customers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customerIndex = mockCustomers.findIndex((customer) => customer.id === id);

    if (customerIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    const [deletedCustomer] = mockCustomers.splice(customerIndex, 1);

    return res.json({
      success: true,
      data: deletedCustomer,
      message: 'Customer deleted',
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete customer',
    });
  }
});

export default router;
