import React from 'react'
import { Row, Col, Button, Container } from 'react-bootstrap'
export default function page() {
  return (
    <Container fluid className='p-4'>
      <Row>
        <Col xs={4}>
          <h4 className='font-24 fw-bold'>Orders</h4>
        </Col>
        <Col xs={8}>
          <div className='float-end'>
            <Button className='btn-outline me-2 fw-bold'>History</Button>
            <Button className='btn-filled'>New orders</Button>
          </div>
        </Col>
      </Row>
    </Container>
  )
}
