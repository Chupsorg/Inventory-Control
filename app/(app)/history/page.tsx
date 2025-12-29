"use client"
import { useEffect } from 'react'
import { Row, Col, Container } from 'react-bootstrap'
import Datatable from '@/app/components/Datatable';
import { TableColumn } from 'react-data-table-component';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCallApiMutation } from '@/app/store/services/apiSlice';
import { useDispatch, useSelector } from 'react-redux';
import { Order, setDeliveredOrders } from '@/app/store/features/orderSlice';
import type { RootState } from "@/app/store";

const columns: TableColumn<Order>[] = [
  {
    name: "#",
    selector: (row) => row.id || 0,
    width: "60px",
    sortable: true,
  },
  {
    name: "Order Id",
    selector: (row) => row.orderId,
    sortable: true,
  },
  {
    name: "Ordered Date",
    selector: (row) => row.orderPlacedDate,
    sortable: true,
  },
  {
    name: "Delivery Date",
    selector: (row) => row.deliveryDate,
    sortable: true,
  },
  {
    name: "Status",
    selector: (row) => row.orderStatus,
    cell: (row) => (
      <span
        className={`${
          row.orderStatus === "DELIVERED"
            ? "text-green"
            : row.orderStatus === "WAITING"
            ? "text-secondary"
            : "text-mute"
        }`}
      >
        {row.orderStatus}
      </span>
    ),
  },
];
export default function Page() {
    const router = useRouter();
    const [callApi, { isLoading }] = useCallApiMutation();
    const dispatch = useDispatch();
    const deliveredOrders = useSelector(
    (state: RootState) => state.order.deliveredOrders
    );

    const loginDetails = useSelector(
    (state: RootState) => state.auth.login_Details
    );

    const rehydrated = useSelector(
    (state: RootState) => state._persist?.rehydrated
    );

    useEffect(() => {
    const handleGetDeliveredOrders = async () => {
        try {
        let res = await callApi({
            url: `DeliveryCtl/get-my-orders-list/D`,
        }).unwrap();

        if (res.status) {
            const updatedData: Order[] =
            (res.object as any)?.map((order: Order, index: number) => ({
                ...order,
                id: index + 1,
            })) ?? [];
            dispatch(setDeliveredOrders(updatedData));
        } else {
            console.log(res.message);
        }
        } catch (error) {
        console.error("API error", error);
        }
    };

    if (rehydrated && loginDetails) {
        handleGetDeliveredOrders();
    }
    }, [rehydrated, loginDetails, callApi, dispatch]);
    
    return (
      <Container fluid className="p-4">
        <Row>
          <Col xs={4} className="d-flex align-items-center">
            <Image
              src={"/inventorymanagement/back-icon.svg"}
              height={24}
              width={24}
              alt={"backicon"}
              onClick={() => {
                router.push("/orders");
              }}
            />
            <h3 className="font-24 fw-bold m-0 ms-3">History</h3>
          </Col>
        </Row>
        <Row className="mt-4">
          <Datatable<Order>
            columns={columns}
            rowData={deliveredOrders}
            progressPending={isLoading}
            pagination={true}
          />
        </Row>
      </Container>
    );
}
