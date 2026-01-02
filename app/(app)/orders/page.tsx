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
import { exportToExcel } from "@/app/utils/exportToExcel";
import { getDayName } from "@/app/utils/properties";

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

type ExcelRow = {
  id:number,
  itemName: string;
  storageType: string;
  qty: number;
  measDesc: string;
  receivedQty: number;
  receivedRemark: string;
};

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
        console.log(res.message);
      }
    } catch (error) {
      console.error("API error", error);
    }
  };

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
        selector: (order) =>
          `${order.orderPlacedDate} (${getDayName(
            new Date(order.orderPlacedDate)
          )})`,
        sortable: true,
      },
      {
        name: "Delivery Date",
        selector: (order) =>
          `${order.deliveryDate} (${getDayName(new Date(order.deliveryDate))})`,
        sortable: true,
      },
      {
        name: "Status",
        selector: (order) => order.orderStatus,
        cell: (order) => (
          <span
            className={`${
              order.orderStatus === "WAITING"
                ? "text-green"
                : order.orderStatus === "ENTERED"
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
        width: "160px",
        center: true,
      },
      {
        name: "UOM",
        selector: (row) => `${row.measQty}${row.measDesc}`,
        sortable: true,
        width: "100px",
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
    [handleItemChange]
  );
  const entryOrderDetailColumns: TableColumn<OrderItem>[] = useMemo(
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
      },
      {
        name: "Freezer/Fridge",
        selector: (row) => row.storageType,
        sortable: true,
        center: true,
      },
      {
        name: "Order Qty",
        selector: (row) => row.qty,
        center: true,
        cell: (row) => (
          <Form.Control
            type="number"
            className="text-center"
            value={row.qty}
            onChange={(e) =>
              handleItemChange(row.id, "qty", Number(e.target.value))
            }
            style={{ width: "80px" }}
          />
        ),
      },
      {
        name: "UOM",
        selector: (row) => `${row.measQty}${row.measDesc}`,
        sortable: true,
        center: true,
      },
    ],
    [handleItemChange]
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
          console.log(res.message);
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
        console.log(res.message);
      }
    } catch (error) {
      console.error("API error", error);
    }
  };
  const handleDownloadExcel = () => {
    if (orderDetails?.orderedItems) {
      let exceldata = orderDetails?.orderedItems?.map((item: any) => {
        return {
          id: item.id,
          itemName: item.itemName,
          storageType: item.storageType,
          qty: item.qty,
          measDesc: `${item.measQty} x ${item.measDesc}`,
          receivedQty: item.receivedQty,
          receivedRemark: item.receivedRemark
        }
      })
      exportToExcel([
        {
          sheetName: `${orderDetails?.orderId}`,
          data: exceldata as ExcelRow[],
          columns: [
            { header: "#", key: "id" },
            { header: "Item Name", key: "itemName" },
            { header: "Freezer/Fridge", key: "storageType" },
            { header: "Ordered Qty", key: "qty" },
            { header: "UOM", key: `measDesc` },
            { header: "Received Qty", key: "receivedQty" },
            { header: "Remarks", key: "receivedRemark" },
          ],
        }
      ], `Order_Report(${orderDetails?.orderId})`);
    }
  }

  const handleCancelOrder = async () => {
    try {
      const res = await callApi({
        url: `OrderCtl/cancel_partner_order/${orderDetails?.orderId}`
      }).unwrap();

      if (res.status) {
        alert("Order cancelled successfully!");
        setShowOrderDetails(false);
        // Refresh active orders
        const refreshedRes = await callApi({
          url: `DeliveryCtl/get-my-orders-list/A`,
        }).unwrap();

        if (refreshedRes.status) {
          const updatedData: Order[] =
            (refreshedRes.object as any)?.map(
              (order: Order, index: number) => ({
                ...order,
                id: index + 1,
              })
            ) ?? [];
          dispatch(setActiveOrders(updatedData));
        }
      } else {
        console.log(res.message);
      }
    } catch (error) {
      console.error("API error", error);
    }
  }

  const handleSendToPantry = async () => {
    const obj = {
      orderItemId: 0,
      itemCode: 0,
      quantity: 0
    };
    const arr: typeof obj[] = [];
    orderDetails?.orderedItems?.forEach((item) => {
      const newObj = { ...obj };
      newObj.orderItemId = item.orderItemId;
      newObj.itemCode = item.itemCode;
      newObj.quantity = item.qty;
      arr.push(newObj);
    });
    try {
      let res = await callApi({
        url: `OrderCtl/update-partner-order-items-qty/${orderDetails?.orderId}/${loginDetails?.cloudKitchenId}`,
        body: arr as any,
      }).unwrap();

      if (res.status) {
        alert("Order placed successfully");
        setShowOrderDetails(false);
        // Refresh active orders
        const refreshedRes = await callApi({
          url: `DeliveryCtl/get-my-orders-list/A`,
        }).unwrap();

        if (refreshedRes.status) {
          const updatedData: Order[] =
            (refreshedRes.object as any)?.map(
              (order: Order, index: number) => ({
                ...order,
                id: index + 1,
              })
            ) ?? [];
          dispatch(setActiveOrders(updatedData));
        }
      } else {
        console.log(res.message);
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
            <div className="d-flex flex-wrap">
              <Button
                className="btn-outline text-capitalize me-2 mb-1 mb-md-0"
                onClick={() => {
                  handleDownloadExcel();
                }}
              >
                Download as excel
              </Button>
              <Button
                className="btn-outline text-primary me-2 text-capitalize"
                onClick={() => {
                  handleCancelOrder();
                }}
              >
                Cancel Order
              </Button>
              <Button
                className="btn-outline text-primary me-2 text-capitalize"
                onClick={() => {
                  setShowOrderDetails(false);
                }}
              >
                Close
              </Button>
              <Button
                className="btn-filled text-capitalize"
                onClick={() => {
                  if (orderDetails?.orderStatus == "ENTERED") {
                    handleSendToPantry();
                  } else {
                    handleUpdateOrderReceived();
                  }
                }}
              >
                {orderDetails?.orderStatus == "ENTERED"
                  ? `Send To Pantry`
                  : `Save`}
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <Datatable<OrderItem>
              columns={
                orderDetails?.orderStatus == "ENTERED"
                  ? entryOrderDetailColumns
                  : orderDetailColumns
              }
              rowData={orderDetails?.orderedItems || []}
              progressPending={isLoading}
              pagination={true}
            />
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <div>
            <Button
              className="btn-outline text-capitalize me-2 mb-1 mb-md-0"
              onClick={() => {
                handleDownloadExcel();
              }}
            >
              Download as excel
            </Button>
            <Button
              className="btn-outline text-primary me-2 text-capitalize"
              onClick={() => {
                handleCancelOrder();
              }}
            >
              Cancel Order
            </Button>
            <Button
              className="btn-outline text-primary me-2 text-capitalize"
              onClick={() => {
                setShowOrderDetails(false);
              }}
            >
              Close
            </Button>
            <Button
              className="btn-filled text-capitalize"
              onClick={() => {
                if (orderDetails?.orderStatus == "ENTERED") {
                  handleSendToPantry();
                } else {
                  handleUpdateOrderReceived();
                }
              }}
            >
              {orderDetails?.orderStatus == "ENTERED"
                ? `Send To Pantry`
                : `Save`}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
