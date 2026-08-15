import { describe, expect, it } from 'vitest'
import request from 'supertest'
import app from '../../index'

describe('BFF API integration', () => {
  it('returns customers list', async () => {
    const response = await request(app).get('/api/customers')

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body.customers)).toBe(true)
    expect(response.body.customers).toHaveLength(10)
    expect(response.body.total).toBe(78)
    expect(response.body.page).toBe(1)
    expect(response.body.pageSize).toBe(10)
    expect(response.body.totalPages).toBe(8)
  })

  it('searches and paginates customers by name company or email', async () => {
    const response = await request(app).get('/api/customers?name=acme&page=1&pageSize=5')

    expect(response.status).toBe(200)
    expect(response.body.pageSize).toBe(5)
    expect(response.body.filters).toEqual({
      name: 'acme',
      company: '',
      email: '',
    })
    expect(response.body.customers.length).toBeGreaterThan(0)
    expect(
      response.body.customers.every((customer: { name: string; company: string; email: string }) =>
        [customer.name, customer.company, customer.email].some((value) =>
          value.toLowerCase().includes('acme')
        )
      )
    ).toBe(true)
  })

  it('adds edits and deletes customers in memory', async () => {
    const createResponse = await request(app).post('/api/customers').send({
      name: 'Demo Customer',
      company: 'Demo Company',
      email: 'demo-customer@example.com',
      phone: '+1-555-9000',
      status: 'active',
    })

    expect(createResponse.status).toBe(201)
    expect(createResponse.body.success).toBe(true)
    const customerId = createResponse.body.data.id

    const updateResponse = await request(app).put(`/api/customers/${customerId}`).send({
      name: 'Edited Customer',
      company: 'Edited Company',
      email: 'edited-customer@example.com',
      phone: '+1-555-9001',
      status: 'pending',
    })

    expect(updateResponse.status).toBe(200)
    expect(updateResponse.body.data).toMatchObject({
      id: customerId,
      name: 'Edited Customer',
      status: 'pending',
    })

    const deleteResponse = await request(app).delete(`/api/customers/${customerId}`)

    expect(deleteResponse.status).toBe(200)
    expect(deleteResponse.body.success).toBe(true)
  })

  it('returns task list with required task fields', async () => {
    const response = await request(app).get('/api/tasks')

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body.tasks)).toBe(true)
    expect(typeof response.body.total).toBe('number')

    expect(response.body.tasks.length).toBeGreaterThan(0)
    expect(response.body.tasks[0]).toMatchObject({
      taskId: expect.any(String),
      title: expect.any(String),
      project: expect.any(String),
      priority: expect.any(String),
      date: expect.any(String),
      owner: expect.any(String),
    })
  })

  it('updates task fields from actions menu edit flow', async () => {
    const response = await request(app).patch('/api/tasks/TASK-1001').send({
      title: 'Updated task title',
      project: 'Updated project',
      priority: 'Medium',
      date: '2026-03-12',
      owner: 'Updated Owner',
    })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.task).toMatchObject({
      taskId: 'TASK-1001',
      title: 'Updated task title',
      project: 'Updated project',
      priority: 'Medium',
      date: '2026-03-12',
      owner: 'Updated Owner',
    })
  })

  it('deletes task after confirmation flow', async () => {
    const response = await request(app).delete('/api/tasks/TASK-1004')

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.deletedTaskId).toBe('TASK-1004')
  })

  it('returns dashboard data for valid user payload', async () => {
    const response = await request(app).post('/api/dashboard').send({
      user: {
        email: 'demo@example.com',
        name: 'Demo User',
      },
    })

    expect(response.status).toBe(200)
    expect(response.body.variant).toBe('general')
    expect(response.body.welcomeMessage).toContain('Demo User')
    expect(response.body.summaryMessage).toContain('workspace')
    expect(Array.isArray(response.body.kpiCards)).toBe(true)
    expect(Array.isArray(response.body.revenueSeries)).toBe(true)
    expect(response.body.revenueSummary).toMatchObject({
      value: expect.any(String),
      delta: expect.any(String),
      details: expect.any(Array),
    })
    expect(Array.isArray(response.body.channelBreakdown)).toBe(true)
    expect(Array.isArray(response.body.topCampaigns)).toBe(true)
  })

  it('returns the admin dashboard for Admin role users', async () => {
    const response = await request(app).post('/api/dashboard').send({
      user: {
        email: 'admin@example.com',
        name: 'Admin User',
        roleNames: ['Admin'],
      },
    })

    expect(response.status).toBe(200)
    expect(response.body.variant).toBe('admin')
    expect(response.body.kpiCards[0].label).toBe('Total Revenue')
  })

  it('returns the sales dashboard for Sales role users', async () => {
    const response = await request(app).post('/api/dashboard').send({
      user: {
        email: 'sales@example.com',
        name: 'Sales User',
        roleNames: ['Sales'],
      },
    })

    expect(response.status).toBe(200)
    expect(response.body.variant).toBe('sales')
    expect(response.body.kpiCards[0].label).toBe('Open Pipeline')
  })

  it('returns the marketing dashboard for Marketing role users', async () => {
    const response = await request(app).post('/api/dashboard').send({
      user: {
        email: 'marketing@example.com',
        name: 'Marketing User',
        roleNames: ['Marketing'],
      },
    })

    expect(response.status).toBe(200)
    expect(response.body.variant).toBe('marketing')
    expect(response.body.kpiCards[0].label).toBe('Campaign Reach')
  })

  it('returns the CRM dashboard for CRM role users', async () => {
    const response = await request(app).post('/api/dashboard').send({
      user: {
        email: 'crm@example.com',
        name: 'CRM User',
        roleNames: ['CRM'],
      },
    })

    expect(response.status).toBe(200)
    expect(response.body.variant).toBe('crm')
    expect(response.body.kpiCards[0].label).toBe('Active Accounts')
  })

  it('returns 400 when dashboard request missing user email', async () => {
    const response = await request(app).post('/api/dashboard').send({
      user: {
        name: 'No Email User',
      },
    })

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('user.email is required')
  })
})
