'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/appStore';
import type { InvoiceItem } from '@/lib/mockData';

function calcTotals(items: InvoiceItem[]) {
  const subTotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const gstRate = 18;
  const gstAmount = (subTotal * gstRate) / 100;
  const half = gstAmount / 2;
  const grandTotal = subTotal + gstAmount;
  return { subTotal, gstRate, gstAmount, cgst: half, sgst: half, grandTotal };
}

export default function InvoicePrintPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data } = useAppStore();

  const invoice = useMemo(
    () => data.invoices.find(inv => inv.id === params.id),
    [data.invoices, params.id],
  );

  if (!invoice) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(circle at top, rgba(15,23,42,1) 0, #020617 55%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#e2e8f0',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Invoice not found</p>
          <button
            onClick={() => router.push('/invoices')}
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              border: '1px solid rgba(148,163,184,0.4)',
              background: 'rgba(15,23,42,0.7)',
              color: '#e2e8f0',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  const { businessProfile } = data;
  const totals = calcTotals(invoice.items);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#020617',
        padding: '32px 0',
        display: 'flex',
        justifyContent: 'center',
        color: '#020617',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 900,
          background: 'white',
          borderRadius: 10,
          boxShadow: '0 25px 60px rgba(15,23,42,0.6)',
          padding: '28px 32px 32px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Tax Invoice
            </h1>
            <p style={{ fontSize: 12, marginTop: 4 }}>GST Compliant — For Indian Small Businesses</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12 }}>
            <p style={{ fontWeight: 700 }}>{businessProfile.businessName}</p>
            <p>{businessProfile.address}</p>
            <p>GSTIN: {businessProfile.gst}</p>
            <p>Phone: {businessProfile.phone}</p>
            <p>Email: {businessProfile.email}</p>
          </div>
        </div>

        {/* Meta */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 1fr',
            gap: 16,
            padding: '14px 16px',
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            marginBottom: 18,
          }}
        >
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Billed To</p>
            <p style={{ fontSize: 13, fontWeight: 700 }}>{invoice.client}</p>
          </div>
          <div style={{ fontSize: 11 }}>
            <p>
              <span style={{ fontWeight: 600, color: '#64748b' }}>Invoice No:</span> {invoice.invoiceNo}
            </p>
            <p>
              <span style={{ fontWeight: 600, color: '#64748b' }}>Invoice Date:</span>{' '}
              {new Date(invoice.date).toLocaleDateString('en-IN')}
            </p>
            <p>
              <span style={{ fontWeight: 600, color: '#64748b' }}>Due Date:</span>{' '}
              {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
            </p>
            <p>
              <span style={{ fontWeight: 600, color: '#64748b' }}>Place of Supply:</span> Maharashtra
            </p>
          </div>
        </div>

        {/* Items table */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12,
            marginBottom: 10,
          }}
        >
          <thead>
            <tr>
              <th style={{ border: '1px solid #e2e8f0', padding: 6, textAlign: 'left' }}>#</th>
              <th style={{ border: '1px solid #e2e8f0', padding: 6, textAlign: 'left' }}>Description</th>
              <th style={{ border: '1px solid #e2e8f0', padding: 6 }}>HSN/SAC</th>
              <th style={{ border: '1px solid #e2e8f0', padding: 6 }}>Qty</th>
              <th style={{ border: '1px solid #e2e8f0', padding: 6, textAlign: 'right' }}>Rate (₹)</th>
              <th style={{ border: '1px solid #e2e8f0', padding: 6, textAlign: 'right' }}>Taxable Value (₹)</th>
              <th style={{ border: '1px solid #e2e8f0', padding: 6, textAlign: 'center' }}>CGST</th>
              <th style={{ border: '1px solid #e2e8f0', padding: 6, textAlign: 'center' }}>SGST</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => {
              const lineAmount = item.qty * item.price;
              const gstPer = totals.gstRate / 2;
              const halfTax = (lineAmount * totals.gstRate) / 100 / 2;
              return (
                <tr key={idx}>
                  <td style={{ border: '1px solid #e2e8f0', padding: 6 }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: 6 }}>{item.description}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: 6, textAlign: 'center' }}>9983</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: 6, textAlign: 'center' }}>{item.qty}</td>
                  <td style={{ border: '1px solid #e2e8f0', padding: 6, textAlign: 'right' }}>
                    {item.price.toLocaleString('en-IN')}
                  </td>
                  <td style={{ border: '1px solid #e2e8f0', padding: 6, textAlign: 'right' }}>
                    {lineAmount.toLocaleString('en-IN')}
                  </td>
                  <td style={{ border: '1px solid #e2e8f0', padding: 6, textAlign: 'center' }}>
                    {gstPer}% / ₹{halfTax.toFixed(2)}
                  </td>
                  <td style={{ border: '1px solid #e2e8f0', padding: 6, textAlign: 'center' }}>
                    {gstPer}% / ₹{halfTax.toFixed(2)}
                  </td>
                </tr>
              );
            })}
            {invoice.items.length === 0 && (
              <tr>
                <td colSpan={8} style={{ border: '1px solid #e2e8f0', padding: 10, textAlign: 'center' }}>
                  No line items.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <table style={{ fontSize: 12 }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 10px', textAlign: 'right' }}>Taxable Value:</td>
                <td style={{ padding: '4px 0', textAlign: 'right', minWidth: 120 }}>
                  ₹{totals.subTotal.toLocaleString('en-IN')}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '4px 10px', textAlign: 'right' }}>CGST ({totals.gstRate / 2}%):</td>
                <td style={{ padding: '4px 0', textAlign: 'right' }}>
                  ₹{totals.cgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '4px 10px', textAlign: 'right' }}>SGST ({totals.gstRate / 2}%):</td>
                <td style={{ padding: '4px 0', textAlign: 'right' }}>
                  ₹{totals.sgst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, borderTop: '1px solid #e2e8f0' }}>
                  Grand Total:
                </td>
                <td
                  style={{
                    padding: '6px 0',
                    textAlign: 'right',
                    fontWeight: 800,
                    borderTop: '1px solid #e2e8f0',
                    fontSize: 14,
                  }}
                >
                  ₹{totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 22, fontSize: 11 }}>
          <div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Terms & Notes</p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Payment due on or before the mentioned due date.</li>
              <li>Late payments may attract interest as per mutual agreement.</li>
              <li>This is a system-generated invoice for demo purposes.</li>
            </ul>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ marginBottom: 36 }}>For {businessProfile.businessName}</p>
            <p style={{ borderTop: '1px solid #e2e8f0', paddingTop: 4 }}>Authorised Signatory</p>
          </div>
        </div>

        {/* Actions (hidden in print) */}
        <div
          style={{
            marginTop: 18,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            onClick={() => router.push('/invoices')}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid #e2e8f0',
              background: 'white',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Back
          </button>
          <button
            onClick={() => window.print()}
            style={{
              padding: '8px 18px',
              borderRadius: 999,
              border: 'none',
              background: '#0f172a',
              color: 'white',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Print Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

