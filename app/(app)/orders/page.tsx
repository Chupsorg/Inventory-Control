"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Row, Col, Button, Container, Modal, Form } from "react-bootstrap";
import Datatable from "@/app/components/Datatable";
import { TableColumn } from "react-data-table-component";
import { useRouter } from "next/navigation";
import { useCallApiMutation } from "@/app/store/services/apiSlice";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { setActiveOrders, Order } from "@/app/store/features/orderSlice";

interface OrderItem {
  id: number;
  itemName: string;
  storageType: string;
  qty: number;
  receivedQty: number;
  receivedRemark: string;
  measQty: number;
  measDesc: string;
  orderStatus: string;
  [key: string]: any;
}

interface OrderDetails {
  orderId?: number;
  orderedItems?: OrderItem[];
  [key: string]: any;
}

export default function Page() {
  const router = useRouter();
  const [callApi, { isLoading }] = useCallApiMutation();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const dispatch = useDispatch();

  const activeOrders = useSelector(
    (state: RootState) => state.order.activeOrders
  );

  const loginDetails = useSelector(
    (state: RootState) => state.auth.login_Details
  );

  const rehydrated = useSelector(
    (state: RootState) => state._persist?.rehydrated
  );

  // 1. FIXED: Use useCallback and functional state update (prev => ...)
  // This prevents orderDetailColumns from re-calculating on every keystroke, fixing focus loss.
  const handleItemChange = useCallback(
    (id: number, field: string, value: string | number) => {
      setOrderDetails((prev) => {
        if (!prev || !prev.orderedItems) return prev;

        const updatedItems = prev.orderedItems.map((item) => {
          if (item.id === id) {
            return { ...item, [field]: value };
          }
          return item;
        });

        return { ...prev, orderedItems: updatedItems };
      });
    },
    []
  );

  // 2. FIXED: Moved this function BEFORE 'columns' definition
  // 'columns' references this function, so it must be defined first.
  const handleGetOrderDetails = async (order: any) => {
    try {
      let res = await callApi({
        url: `DeliveryCtl/get-order-details/${order?.orderId}`,
      }).unwrap();

      if (res.status) {
        const updatedData: OrderItem[] =
          (res.object as any)?.orderedItems?.map((item: any, index: number) => ({
            ...item,
            id: index + 1,
            // Ensure fields exist for inputs
            receivedQty: item.receivedQty ?? item.qty, // Default to ordered qty if null
            receivedRemark: item.receivedRemark ?? "",
          })) ?? [];

        const modifiedOrder = {
          ...(res.object as any),
          orderedItems: updatedData,
        };

        setOrderDetails(modifiedOrder);
        setShowOrderDetails(true);
      } else {
        alert(res.message);
      }
    } catch (error) {
      console.error("API error", error);
    }
  };

  // 3. FIXED: Wrapped in useMemo so it doesn't get recreated on every render
  const columns: TableColumn<Order>[] = useMemo(
    () => [
      {
        name: "#",
        selector: (order) => order.id || 0,
        width: "60px",
        sortable: true,
      },
      {
        name: "Order Id",
        selector: (order) => order.orderId,
        sortable: true,
      },
      {
        name: "Ordered Date",
        selector: (order) => order.orderPlacedDate,
        sortable: true,
      },
      {
        name: "Delivery Date",
        selector: (order) => order.deliveryDate,
        sortable: true,
      },
      {
        name: "Status",
        selector: (order) => order.orderStatus,
        cell: (order) => (
          <span
            className={`${
              order.orderStatus === "DELIVERED"
                ? "text-green"
                : order.orderStatus === "WAITING"
                ? "text-secondary"
                : "text-mute"
            }`}
          >
            {order.orderStatus}
          </span>
        ),
      },
      {
        name: "",
        cell: (order) => (
          <span
            className={`text-primary cursor-pointer`}
            onClick={() => handleGetOrderDetails(order)}
          >
            Change Status
          </span>
        ),
      },
    ],
    [] // Dependencies (add handleGetOrderDetails if linter requires it, but empty is usually fine for stable handlers)
  );

  // 4. FIXED: Removed 'orderDetails' from dependency array
  // This ensures the table structure doesn't rebuild while typing.
  const orderDetailColumns: TableColumn<OrderItem>[] = useMemo(
    () => [
      {
        name: "#",
        selector: (row) => row.id || 0,
        width: "60px",
        sortable: true,
      },
      {
        name: "Item",
        selector: (row) => row.itemName,
        sortable: true,
        width: "200px",
      },
      {
        name: "Freezer/Fridge",
        selector: (row) => row.storageType,
        sortable: true,
        center: true,
      },
      {
        name: "Ordered Qty",
        selector: (row) => row.qty,
        sortable: true,
        center: true,
      },
      {
        name: "UOM",
        selector: (row) => `${row.measQty} x ${row.measDesc}`,
        sortable: true,
        center: true,
      },
      {
        name: "Received Qty",
        selector: (row) => row.receivedQty,
        center: true,
        cell: (row) => (
          <Form.Control
            type="number"
            className="text-center"
            value={row.receivedQty}
            onChange={(e) =>
              handleItemChange(row.id, "receivedQty", Number(e.target.value))
            }
            style={{ width: "80px" }}
          />
        ),
      },
      {
        name: "Remarks",
        selector: (row) => row.receivedRemark,
        grow: 2,
        cell: (row) => (
          <Form.Control
            type="text"
            value={row.receivedRemark || ""}
            onChange={(e) =>
              handleItemChange(row.id, "receivedRemark", e.target.value)
            }
          />
        ),
      },
    ],
    [handleItemChange] // Only depends on the handler now
  );

  useEffect(() => {
    const handleGetActiveOrders = async () => {
      try {
        let res = await callApi({
          url: `DeliveryCtl/get-my-orders-list/A`,
        }).unwrap();

        if (res.status) {
          const updatedData: Order[] =
            (res.object as any)?.map((order: Order, index: number) => ({
              ...order,
              id: index + 1,
            })) ?? [];
          dispatch(setActiveOrders(updatedData));
        } else {
          alert(res.message);
        }
      } catch (error) {
        console.error("API error", error);
      }
    };

    if (rehydrated && loginDetails) {
      handleGetActiveOrders();
    }
  }, [rehydrated, loginDetails, callApi, dispatch]);

  const handleUpdateOrderReceived = async () => {
    const obj = {
      orderItemId: 0,
      itemCode: 0,
      qty: 0,
      measQty: 0,
      measDesc: "",
      measCode: 0,
      itemDeliveryStatus: "",
      receivedQty: 0,
      receivedMeasCode: 0,
      receivedRemark: "",
    }
    const arr: { orderItemId: number; itemCode: number; qty: number; measQty: number; measDesc: string; measCode: number; itemDeliveryStatus: string; receivedQty: number; receivedMeasCode: number; receivedRemark: string; }[] = []
    orderDetails?.orderedItems?.forEach((item) => {
      const newObj = { ...obj };
      newObj.orderItemId = item.orderItemId;
      newObj.itemCode = item.itemCode;
      newObj.qty = item.qty;
      newObj.measQty = item.measQty;
      newObj.measDesc = item.measDesc;
      newObj.measCode = item.measCode;
      newObj.itemDeliveryStatus = item.orderStatus;
      newObj.receivedQty = item.receivedQty;
      newObj.receivedMeasCode = item.measCode;
      newObj.receivedRemark = item.receivedRemark;
      arr.push(newObj);
    });
    try {
      let res = await callApi({
        url: `DeliveryCtl/update-order-item-received-qty/${orderDetails?.orderId}`,
        body: arr as any,
      }).unwrap();

      if (res.status) {
        alert("Order updated successfully");
        setShowOrderDetails(false);
        // Refresh active orders
        const refreshedRes = await callApi({
          url: `DeliveryCtl/get-my-orders-list/A`,
        }).unwrap();

        if (refreshedRes.status) {
          const updatedData: Order[] =
            (refreshedRes.object as any)?.map((order: Order, index: number) => ({
              ...order,
              id: index + 1,
            })) ?? [];
          dispatch(setActiveOrders(updatedData));
        }
      } else {
        alert(res.message);
      }
    } catch (error) {
      console.error("API error", error);
    }
  };

  return (
    <Container fluid className="p-4">
      <Row>
        <Col xs={4}>
          <h4 className="font-24 fw-bold">Orders</h4>
        </Col>
        <Col xs={8}>
          <div className="float-end">
            <Button
              className="btn-outline me-2 fw-bold"
              onClick={() => {
                router.push("/history");
              }}
            >
              History
            </Button>
            <Button
              className="btn-filled"
              onClick={() => {
                router.push("/config");
              }}
            >
              New orders
            </Button>
          </div>
        </Col>
      </Row>
      <Row className="mt-4">
        <Datatable<Order>
          columns={columns}
          rowData={activeOrders}
          progressPending={isLoading}
          pagination={true}
        />
      </Row>
      <Modal
        show={showOrderDetails}
        onHide={() => {
          setShowOrderDetails(false);
        }}
        fullscreen
        backdrop="static"
      >
        <Modal.Header className="p-2">
          <Modal.Title className="font-14">Order Details</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="d-flex align-items-center justify-content-between">
            <p className="font-24 fw-bold">Order ID: {orderDetails?.orderId}</p>
            <div>
              <Button
                className="btn-outline text-primary me-2 text-capitalize"
                onClick={() => {
                  setShowOrderDetails(false);
                }}
              >
                Cancel
              </Button>
              <Button
                className="btn-filled text-capitalize"
                onClick={() => {
                  handleUpdateOrderReceived();
                }}
              >
                Apply
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <Datatable<OrderItem>
              columns={orderDetailColumns}
              rowData={orderDetails?.orderedItems || []}
              progressPending={isLoading}
              pagination={true}
            />
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <div>
            <Button
              className="btn-outline text-primary me-2 text-capitalize"
              onClick={() => {
                setShowOrderDetails(false);
              }}
            >
              Cancel
            </Button>
            <Button
              className="btn-filled text-capitalize"
              onClick={() => {
                handleUpdateOrderReceived();
              }}
            >
              Apply
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
