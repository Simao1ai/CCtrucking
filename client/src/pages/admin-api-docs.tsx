import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Key } from "lucide-react";

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono whitespace-pre">
      {children}
    </pre>
  );
}

function EndpointCard({ method, path, description, requestBody, responseExample }: {
  method: "GET" | "POST" | "PATCH";
  path: string;
  description: string;
  requestBody?: string;
  responseExample: string;
}) {
  const methodColors: Record<string, string> = {
    GET: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    POST: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    PATCH: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${methodColors[method]}`}>
          {method}
        </span>
        <code className="text-sm font-mono">{path}</code>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      {requestBody && (
        <div>
          <p className="text-xs font-medium mb-1">Request Body:</p>
          <CodeBlock>{requestBody}</CodeBlock>
        </div>
      )}
      <div>
        <p className="text-xs font-medium mb-1">Response:</p>
        <CodeBlock>{responseExample}</CodeBlock>
      </div>
    </div>
  );
}

export default function AdminApiDocs() {
  const baseUrl = window.location.origin;

  return (
    <div className="p-6 space-y-6" data-testid="admin-api-docs-page">
      <PageHeader
        title="API Documentation"
        description="Reference guide for the CarrierDeskHQ programmatic API"
        icon={<BookOpen className="w-5 h-5 text-primary" />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4" />
            Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All API requests must include your API key in the Authorization header.
          </p>
          <CodeBlock>{`Authorization: Bearer cdhq_your_api_key_here`}</CodeBlock>

          <div>
            <p className="text-sm font-medium mb-2">Example with curl:</p>
            <CodeBlock>{`curl -H "Authorization: Bearer cdhq_your_api_key_here" \\
  ${baseUrl}/api/v1/clients`}</CodeBlock>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Example with JavaScript:</p>
            <CodeBlock>{`const response = await fetch("${baseUrl}/api/v1/clients", {
  headers: {
    "Authorization": "Bearer cdhq_your_api_key_here",
    "Content-Type": "application/json"
  }
});
const { data, meta } = await response.json();`}</CodeBlock>
          </div>

          <div className="flex gap-2">
            <Badge variant="outline">Rate Limit: 120 requests/minute per key</Badge>
            <Badge variant="outline">Format: JSON</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Response Format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            All list endpoints return paginated results with this structure:
          </p>
          <CodeBlock>{`{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 42,
    "totalPages": 2
  }
}`}</CodeBlock>
          <p className="text-sm text-muted-foreground">
            Single-item endpoints return: <code className="bg-muted px-1 rounded">{"{ \"data\": {...} }"}</code>
          </p>
          <p className="text-sm text-muted-foreground">
            Error responses: <code className="bg-muted px-1 rounded">{"{ \"error\": true, \"message\": \"...\", \"code\": \"...\" }"}</code>
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="clients" data-testid="tabs-api-resources">
        <TabsList>
          <TabsTrigger value="clients" data-testid="tab-clients">Clients</TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices">Invoices</TabsTrigger>
          <TabsTrigger value="tickets" data-testid="tab-tickets">Tickets</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-4 mt-4">
          <EndpointCard
            method="GET"
            path="/api/v1/clients"
            description="List all clients. Supports pagination and status filtering."
            responseExample={`// GET /api/v1/clients?page=1&limit=10&status=active
{
  "data": [
    {
      "id": "abc-123",
      "companyName": "Acme Trucking",
      "contactName": "John Doe",
      "email": "john@acme.com",
      "phone": "555-0100",
      "status": "active",
      "dotNumber": "123456",
      "mcNumber": "MC-789"
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}`}
          />
          <EndpointCard
            method="GET"
            path="/api/v1/clients/:id"
            description="Get a single client by ID."
            responseExample={`{
  "data": {
    "id": "abc-123",
    "companyName": "Acme Trucking",
    "contactName": "John Doe",
    "email": "john@acme.com",
    "status": "active"
  }
}`}
          />
          <EndpointCard
            method="POST"
            path="/api/v1/clients"
            description="Create a new client. Subject to plan limits."
            requestBody={`{
  "companyName": "New Transport Co",
  "contactName": "Jane Smith",
  "email": "jane@newtransport.com",
  "phone": "555-0200",
  "dotNumber": "654321"
}`}
            responseExample={`{
  "data": {
    "id": "def-456",
    "companyName": "New Transport Co",
    "status": "active"
  }
}`}
          />
          <EndpointCard
            method="PATCH"
            path="/api/v1/clients/:id"
            description="Update an existing client."
            requestBody={`{
  "phone": "555-0300",
  "status": "inactive"
}`}
            responseExample={`{
  "data": {
    "id": "abc-123",
    "companyName": "Acme Trucking",
    "phone": "555-0300",
    "status": "inactive"
  }
}`}
          />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4 mt-4">
          <EndpointCard
            method="GET"
            path="/api/v1/invoices"
            description="List all invoices. Filter by status or clientId."
            responseExample={`// GET /api/v1/invoices?status=sent&clientId=abc-123
{
  "data": [
    {
      "id": "inv-001",
      "invoiceNumber": "INV-2026-001",
      "clientId": "abc-123",
      "amount": "1500.00",
      "status": "sent",
      "dueDate": "2026-04-01T00:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 1, "totalPages": 1 }
}`}
          />
          <EndpointCard
            method="GET"
            path="/api/v1/invoices/:id"
            description="Get a single invoice with line items."
            responseExample={`{
  "data": {
    "id": "inv-001",
    "invoiceNumber": "INV-2026-001",
    "amount": "1500.00",
    "status": "sent",
    "lineItems": [
      { "description": "IFTA Filing Q1", "quantity": 1, "unitPrice": "750.00", "amount": "750.00" },
      { "description": "DOT Compliance Review", "quantity": 1, "unitPrice": "750.00", "amount": "750.00" }
    ]
  }
}`}
          />
          <EndpointCard
            method="POST"
            path="/api/v1/invoices"
            description="Create a new invoice."
            requestBody={`{
  "clientId": "abc-123",
  "invoiceNumber": "INV-2026-010",
  "amount": "500.00",
  "description": "Monthly bookkeeping service",
  "dueDate": "2026-05-01"
}`}
            responseExample={`{
  "data": {
    "id": "inv-010",
    "invoiceNumber": "INV-2026-010",
    "amount": "500.00",
    "status": "draft"
  }
}`}
          />
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4 mt-4">
          <EndpointCard
            method="GET"
            path="/api/v1/tickets"
            description="List all service tickets. Filter by status or clientId."
            responseExample={`// GET /api/v1/tickets?status=open
{
  "data": [
    {
      "id": "tkt-001",
      "title": "Q1 IFTA Filing",
      "serviceType": "IFTA Permit",
      "status": "open",
      "priority": "high",
      "clientId": "abc-123"
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 1, "totalPages": 1 }
}`}
          />
          <EndpointCard
            method="POST"
            path="/api/v1/tickets"
            description="Create a new service ticket."
            requestBody={`{
  "clientId": "abc-123",
  "title": "Annual DOT Review",
  "serviceType": "DOT Permit",
  "priority": "medium",
  "description": "Annual compliance review needed"
}`}
            responseExample={`{
  "data": {
    "id": "tkt-010",
    "title": "Annual DOT Review",
    "status": "open"
  }
}`}
          />
          <EndpointCard
            method="PATCH"
            path="/api/v1/tickets/:id"
            description="Update a ticket (e.g., change status, priority)."
            requestBody={`{
  "status": "in_progress",
  "assignedTo": "Jane Smith"
}`}
            responseExample={`{
  "data": {
    "id": "tkt-001",
    "status": "in_progress",
    "assignedTo": "Jane Smith"
  }
}`}
          />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 mt-4">
          <EndpointCard
            method="GET"
            path="/api/v1/documents"
            description="List all documents. Filter by clientId."
            responseExample={`// GET /api/v1/documents?clientId=abc-123
{
  "data": [
    {
      "id": "doc-001",
      "name": "MCS-150 Filing.pdf",
      "type": "compliance",
      "status": "approved",
      "clientId": "abc-123"
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 1, "totalPages": 1 }
}`}
          />
          <EndpointCard
            method="GET"
            path="/api/v1/documents/:id"
            description="Get a single document by ID."
            responseExample={`{
  "data": {
    "id": "doc-001",
    "name": "MCS-150 Filing.pdf",
    "type": "compliance",
    "status": "approved",
    "uploadedAt": "2026-03-01T10:30:00.000Z"
  }
}`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
