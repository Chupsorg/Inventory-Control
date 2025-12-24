"use client"
import React, { useState, useEffect } from 'react'
import { Row, Col, Button, Container } from 'react-bootstrap'
import Datatable from '@/app/components/Datatable';
import { TableColumn } from 'react-data-table-component';
import { useRouter } from 'next/navigation';
type OrderRow = {
  id: number;
  orderId: string;
  orderedDate: string;
  deliveryDate: string;
  storageType: 'Fridge' | 'Freezer';
  status: 'Pending' | 'Delivered' | 'Cancelled';
};

export default function page() {
  const router = useRouter()
  const columns: TableColumn<OrderRow>[] = [
    {
      name: '#',
      selector: row => row.id,
      width: '60px',
      sortable: true,
    },
    {
      name: 'Order Id',
      selector: row => row.orderId,
      sortable: true,
    },
    {
      name: 'Ordered Date',
      selector: row => row.orderedDate,
      sortable: true,
    },
    {
      name: 'Delivery Date',
      selector: row => row.deliveryDate,
      sortable: true,
    },
    {
      name: 'Fridge / Freezer',
      selector: row => row.storageType,
    },
    {
      name: 'Status',
      selector: row => row.status,
      cell: row => (
        <span
          className={`${row.status === 'Delivered'
            ? 'text-green'
            : row.status === 'Pending'
              ? 'text-secondary'
              : 'text-mute'
            }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      name: '',
      selector: row => row.status,
      cell: row => (
        <span
          className={`text-primary`}
        >
          Change Status
        </span>
      ),
    },
  ];
  const [rowData, setRowData] = useState<OrderRow[]>([]);

  useEffect(() => {
    setRowData([
      {
        id: 1,
        orderId: 'ORD-1021',
        orderedDate: '22 Dec 2025',
        deliveryDate: '24 Dec 2025',
        storageType: 'Fridge',
        status: 'Pending',
      },
    ]);
  }, []);
  return (
    <Container fluid className='p-4'>
      <Row>
        <Col xs={4}>
          <h4 className='font-24 fw-bold'>Orders</h4>
        </Col>
        <Col xs={8}>
          <div className='float-end'>
            <Button className='btn-outline me-2 fw-bold' onClick={()=>{router.push('/history')}}>History</Button>
            <Button className='btn-filled' onClick={() => { router.push("/config") }}>New orders</Button>
          </div>
        </Col>
      </Row>
      <Row className='mt-4'>
        <Datatable<OrderRow>
          columns={columns}
          rowData={rowData}
        />
      </Row>
    </Container>
  )
}
