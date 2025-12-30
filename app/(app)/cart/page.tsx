"use client";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { useCallApiMutation } from "@/app/store/services/apiSlice";
import { useRouter } from "next/navigation";
import {
  Container,
  Row,
  Col,
  Button,
  Form,
  Dropdown,
  InputGroup,
  Modal,
} from "react-bootstrap";
import Image from "next/image";
import { TableColumn } from "react-data-table-component";
import Datatable from "@/app/components/Datatable";
import { getDayName, formatDate } from "@/app/utils/properties";
import moment from "moment";

type OrderRow = {
  id: number;
  itemCode: number;
  itemName: string;
  itemType: string;
  availableQty: number;
  recommendedQty: number;
  reqQty: number;
  originalReqQty: number;
  storageType: string;
  uom: string;
  measQty: number;
  measCode: number;
  groupIndex: number;
  checked: boolean;
  itemDelDate?: string;
};

type GroupUiState = {
  searchText: string;
  viewFilter: "ALL" | "ZERO" | "UNCHANGED";
  bulkMode: "PERCENT" | "VALUE";
  bulkOperator: "+" | "-";
  bulkValue: number | "";
};

export default function Page() {
  const [callApi, { isLoading }] = useCallApiMutation();
  const router = useRouter();
  const loginDetails = useSelector(
    (state: RootState) => state.auth.login_Details
  );
  const { list: primaryItemList } = useSelector(
    (state: RootState) => state.primaryItems
  );

  const [cartItem, setcartItem] = useState<any[]>([]);
  const [itemList, setitemList] = useState<any[]>([]);

  const [groupUiStates, setGroupUiStates] = useState<{
    [key: number]: GroupUiState;
  }>({});

  const [newItemModal, setnewItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);

  const getUiState = (index: number): GroupUiState => {
    return (
      groupUiStates[index] || {
        searchText: "",
        viewFilter: "ALL",
        bulkMode: "VALUE",
        bulkOperator: "+",
        bulkValue: "",
      }
    );
  };

  const updateUiState = (index: number, updates: Partial<GroupUiState>) => {
    setGroupUiStates((prev) => ({
      ...prev,
      [index]: { ...getUiState(index), ...updates },
    }));
  };

  const getFilteredItems = (items: OrderRow[], groupIndex: number) => {
    const ui = getUiState(groupIndex);
    let filtered = items;

    if (ui.searchText) {
      const lower = ui.searchText.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.itemName.toLowerCase().includes(lower) ||
          i.itemCode.toString().includes(lower) ||
          i.storageType.toLowerCase().includes(lower)
      );
    }

    if (ui.viewFilter === "ZERO") {
      filtered = filtered.filter((i) => i.reqQty === 0);
    } else if (ui.viewFilter === "UNCHANGED") {
      filtered = filtered.filter((i) => i.reqQty === i.originalReqQty);
    }

    return filtered;
  };

  const getColumns = (groupIndex: number): TableColumn<OrderRow>[] => {
    const currentGroup = cartItem[groupIndex];
    if (!currentGroup) return [];

    const visibleItems = getFilteredItems(currentGroup.items, groupIndex);
    const allChecked =
      visibleItems.length > 0 && visibleItems.every((i) => i.checked);

    return [
      {
        name: (
          <Form.Check
            type="checkbox"
            className="rb-orange-check"
            checked={!!allChecked}
            onChange={(e) => {
              const checked = e.target.checked;
              setcartItem((prev) =>
                prev.map((grp, i) => {
                  if (i !== groupIndex) return grp;
                  const updatedItems = grp.items.map((itm: OrderRow) => {
                    const isVisible = visibleItems.some((v) => v.id === itm.id);
                    return isVisible ? { ...itm, checked } : itm;
                  });
                  return { ...grp, items: updatedItems };
                })
              );
            }}
          />
        ),
        width: "60px",
        sortable: false,
        cell: (row) => (
          <Form.Check
            type="checkbox"
            className="rb-orange-check"
            checked={row.checked}
            onChange={() => {
              setcartItem((prev) =>
                prev.map((grp, i) =>
                  i === groupIndex
                    ? {
                        ...grp,
                        items: grp.items.map((itm: any) =>
                          itm.id === row.id
                            ? { ...itm, checked: !itm.checked }
                            : itm
                        ),
                      }
                    : grp
                )
              );
            }}
          />
        ),
      },
      { name: "#", selector: (row) => row.id, width: "60px", sortable: true },
      {
        name: "Item",
        selector: (row) => row.itemName,
        sortable: true,
        grow: 2,
      },
      {
        name: "Storage",
        selector: (row) => row.storageType,
        sortable: true,
        center: true,
        width: "100px",
      },
      {
        name: "Avail",
        selector: (row) => row.availableQty,
        sortable: true,
        center: true,
        width: "90px",
      },
      {
        name: "Rec",
        selector: (row) => row.recommendedQty,
        sortable: true,
        center: true,
        width: "90px",
      },
      {
        name: "Required",
        width: "140px",
        center: true,
        cell: (row) => (
          <Form.Control
            type="number"
            className={`text-center ${
              row.reqQty !== row.originalReqQty
                ? "border-warning bg-light-warning"
                : ""
            }`}
            value={row.reqQty}
            onChange={(e) => {
              const qty = Math.max(0, Number(e.target.value));
              setcartItem((prev) =>
                prev.map((grp, i) =>
                  i === groupIndex
                    ? {
                        ...grp,
                        items: grp.items.map((itm: any) =>
                          itm.id === row.id ? { ...itm, reqQty: qty } : itm
                        ),
                      }
                    : grp
                )
              );
            }}
          />
        ),
      },
      { name: "UOM", width: "80px", selector: (row) => `${row.measQty}${row.uom}`, center: true },
      {
        name: "",
        width: "60px",
        cell: (row) => (
          <Dropdown align="end">
            <Dropdown.Toggle
              variant="link"
              className="p-0 border-0 more-toggle"
            >
              <Image
                src={"/inventorymanagement/more-icon.svg"}
                height={24}
                width={24}
                alt="more"
              />
            </Dropdown.Toggle>
            <Dropdown.Menu
              className="more-menu"
              renderOnMount
              popperConfig={{ strategy: "fixed" }}
            >
              {cartItem.map((grp, targetIndex) => {
                if (targetIndex === groupIndex) return null;
                return (
                  <Dropdown.Item
                    key={targetIndex}
                    onClick={() => handleMoveItem(groupIndex, targetIndex, row)}
                  >
                    Move to {getDayName(new Date(grp.config.date))}
                  </Dropdown.Item>
                );
              })}
              <Dropdown.Divider />
              <Dropdown.Item
                className="text-danger"
                onClick={() => handleRowDelete(groupIndex, row.id)}
              >
                Delete
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        ),
        center: true,
      },
    ];
  };

  // --- Bulk Update Logic ---
  const handleBulkApply = (groupIndex: number) => {
    const ui = getUiState(groupIndex);
    const value = Number(ui.bulkValue);

    if (!value && value !== 0) return;

    setcartItem((prev) =>
      prev.map((grp, i) => {
        if (i !== groupIndex) return grp;

        const updatedItems = grp.items.map((itm: OrderRow) => {
          // Only update checked items
          if (!itm.checked) return itm;

          let delta = 0;
          if (ui.bulkMode === "PERCENT") {
            delta = (itm.reqQty * value) / 100;
          } else {
            delta = value;
          }

          let newQty =
            ui.bulkOperator === "+" ? itm.reqQty + delta : itm.reqQty - delta;
          newQty = Math.max(0, Math.round(newQty));

          return { ...itm, reqQty: newQty };
        });

        return { ...grp, items: updatedItems };
      })
    );

    // Optional: clear selection after apply?
    // keeping selection allows iterative updates, so leaving it.
  };

  // --- Data Loading (Same as before) ---
  const buildPrimaryItemPayload = (items: any) => {
    let array: any[] = [];
    items?.map((itm: any) => {
      array.push({
        qty: itm.rcomQty,
        meas_qty: itm.itemMeasQty,
        item_code: itm.itemCode,
        meas_code: itm.itemMeasCode,
      });
    });
    return array;
  };

  useEffect(() => {
    if (!loginDetails || !primaryItemList?.length) return;
    const fetchAll = async () => {
      try {
        const responses = await Promise.all(
          primaryItemList.map((cfg: any) =>
            callApi({
              url: `StoreCtl/get-inventory-assembly-items-list/${loginDetails?.cloudKitchenId} `,
              body: buildPrimaryItemPayload(cfg.items) as any,
            }).unwrap()
          )
        );

        const result = responses.map((res, index) => {
          const itemsWithIds = (res.object as any[])?.map(
            (itm: any, i: number) => {
              const calculatedReqQty =
                itm.recommendedQty > itm.availableQty
                  ? Math.max(0, itm.maxQty - itm.availableQty)
                  : Math.max(0, itm.recommendedQty - itm.availableQty);

              return {
                ...itm,
                id: i + 1,
                checked: false,
                reqQty: calculatedReqQty,
                originalReqQty: calculatedReqQty,
              };
            }
          );
          return { config: primaryItemList[index].config, items: itemsWithIds };
        });
        setcartItem(result);
      } catch (err) {
        console.error(err);
      }
      try {
        const res = await callApi({
          url: `StoreCtl/get-kitchen-assembly-items-list/${loginDetails?.cloudKitchenId}`,
        }).unwrap();
        if (res?.status) setitemList((res.object as any) || []);
      } catch (error) {
        console.error("Failed to fetch item list", error);
      }
    };
    fetchAll();
  }, [loginDetails, primaryItemList]);

  const buildPlaceOrderPayload = (cartItem: any) => {
    console.log(loginDetails);
    console.log(cartItem.config);
    const reqBody = {
      cloudKitchenId: 1,
      name: loginDetails?.userName,
      mobile: "",
      delDate: moment(cartItem.config.date).format("YYYY-MM-DD") + " 00:00:00",
      couponId: 0,
      delType: "ID",
      storeType: "R",
      pointCheck: "N",
      usedPointsAmt: "",
      pointsAmt: "",
      taxPercentage: 0,
      modeOfOrder: "W",
      paymentRequired: "N",
      subTotal: 0,
      tax: 0,
      discountAmt: 0,
      couponDiscountAmt: 0,
      tips: 0,
      totalOrderAmount: 0,
      pendingPayment: "Y",
      entityType: "INTERNAL",
      kitchenLocationId: 0,
      itemList: buildPlaceOrderItemsPayload(cartItem, false),
      partnerLocation: loginDetails?.cloudKitchenName,
      partnerKitchenId: loginDetails?.cloudKitchenId,
      partnerItemDeliveryList: buildPlaceOrderItemsPayload(cartItem, true),
    };
    console.log("Place Order Payload: ", reqBody);
    return reqBody;
  };
  const buildPlaceOrderItemsPayload = (
    cartItem: any,
    isPartnerItemDeliveryList?: boolean
  ) => {
    const array: {
      menuId: number;
      cgyId: number;
      itemCode: number;
      itemType: string;
      quantity: number;
      remarks: string;
      listMeasurements: Array<{
        qty: number;
        measurementCode: number;
        measurementDesc: string;
        rate: number;
      }>;
    }[] = [];
    const array1: {
      menuId: number;
      cgyId: number;
      itemCode: number;
      itemType: string;
      quantity: number;
      remarks: string;
      listMeasurements: Array<{
        qty: number;
        measurementCode: number;
        measurementDesc: string;
        rate: number;
      }>;
      itemDelDate: string;
    }[] = [];
    cartItem?.items?.map((itm: any) => {
      if(itm.reqQty<=0) return;
      array.push({
        menuId: 0,
        cgyId: 0,
        itemCode: itm.itemCode,
        itemType: itm.itemType,
        quantity: itm.reqQty,
        remarks: "",
        listMeasurements: [
          {
            measurementDesc: itm.uom,
            measurementCode: itm.measCode,
            qty: itm.measQty,
            rate: 0,
          },
        ],
      });
      array1.push({
        menuId: 0,
        cgyId: 0,
        itemCode: itm.itemCode,
        itemType: itm.itemType,
        quantity: itm.reqQty,
        remarks: "",
        listMeasurements: [
          {
            measurementDesc: itm.uom,
            measurementCode: itm.measCode,
            qty: itm.measQty,
            rate: 0,
          },
        ],
        itemDelDate: moment(cartItem.config.date).format("YYYY-MM-DD"),
      });
    });
    return isPartnerItemDeliveryList ? array1 : array;
  };
  const handlePlaceOrder = async () => {
    if (!loginDetails || !cartItem?.length) return;
    cartItem.forEach(async (cItem: any) => {
      console.log(buildPlaceOrderPayload(cItem));
      try {
        const res = await callApi({
          url: "OrderCtl/place_partner_order",
          body: buildPlaceOrderPayload(cItem) as any,
        }).unwrap();

        if (res?.status) {
          alert(
            `Order for ${getDayName(
              new Date(cItem.config.date)
            )} placed successfully!`
          );
          if (cartItem.indexOf(cItem) === cartItem.length - 1) {
            router.push("/orders");
          }
        } else {
          alert(
            `Failed to place order for ${getDayName(
              new Date(cItem.config.date)
            )}`
          );
        }
      } catch (error) {
        console.error("Failed to place order", error);
        alert(
          `Error placing order for ${getDayName(new Date(cItem.config.date))}`
        );
      }
    });
  };

  const handleBulkMoveToNext = (currentIndex: number) => {
    // if (currentIndex >= cartItem.length - 1) {
    //   alert("No next delivery available to move items to.");
    //   return;
    // }

    const currentGroup = cartItem[currentIndex];
    const itemsToMove = currentGroup.items.filter((item: any) => item.checked);

    if (itemsToMove.length === 0) {
      alert("Please select items to move.");
      return;
    }

    setcartItem((prev) => {
      const newState = [...prev];

      // 1. Remove items from current group
      newState[currentIndex] = {
        ...newState[currentIndex],
        items: newState[currentIndex].items.filter(
          (item: any) => !item.checked
        ),
      };

      // Determine destination index
      const targetIndex =
        currentIndex >= cartItem.length - 1
          ? currentIndex - 1
          : currentIndex + 1;

      const destinationGroup = newState[targetIndex];
      const destinationItems = destinationGroup.items;

      // Get the date from the destination group's config
      const targetDate = destinationGroup.config.date;

      const maxId =
        destinationItems.length > 0
          ? Math.max(...destinationItems.map((i: any) => i.id))
          : 0;

      // 2. Add items to destination group with UPDATED DATE
      const itemsToAdd = itemsToMove.map((item: any, index: number) => ({
        ...item,
        checked: false,
        id: maxId + 1 + index,
        // Explicitly update the item's date to match the new group's config date
        itemDelDate: moment(targetDate).format("YYYY-MM-DD"),
      }));

      newState[targetIndex] = {
        ...newState[targetIndex],
        items: [...destinationItems, ...itemsToAdd],
      };

      return newState;
    });
  };
  const handleRowDelete = (groupIndex: number, rowId: number) => {
    setcartItem((prev) =>
      prev.map((grp, i) =>
        i === groupIndex
          ? { ...grp, items: grp.items.filter((itm: any) => itm.id !== rowId) }
          : grp
      )
    );
  };
  const handleMoveItem = (
    fromGroupIndex: number,
    toGroupIndex: number,
    row: OrderRow
  ) => {
    if (fromGroupIndex === toGroupIndex) return;

    setcartItem((prev) => {
      const updated = [...prev];

      // 1. Remove from source
      updated[fromGroupIndex] = {
        ...updated[fromGroupIndex],
        items: updated[fromGroupIndex].items.filter(
          (itm: any) => itm.id !== row.id
        ),
      };

      // Get the date from the destination group
      const targetDate = updated[toGroupIndex].config.date;

      // 2. Add to destination with UPDATED DATE
      updated[toGroupIndex] = {
        ...updated[toGroupIndex],
        items: [
          ...updated[toGroupIndex].items,
          {
            ...row,
            checked: false,
            // Explicitly update the item's date property
            itemDelDate: moment(targetDate).format("YYYY-MM-DD"),
          },
        ],
      };

      return updated;
    });
  };
  const handleHeaderDelete = (groupIndex: number) => {
    setcartItem((prev) =>
      prev.map((grp, i) =>
        i === groupIndex
          ? { ...grp, items: grp.items.filter((itm: any) => !itm.checked) }
          : grp
      )
    );
  };
  const handleAddNewItem = () => {
    // if (!selectedItem && !selectedUom) {
    //   alert("Please select item and UOM");
    //   return;
    // }

    if (!selectedItem) {
      alert("Please select item");
      return;
    }

    // if (!selectedUom) {
    //   alert("Please select UOM");
    //   return;
    // }

    if (activeGroupIndex === null) return;

    setcartItem((prev) =>
      prev.map((grp, gIndex) => {
        if (gIndex !== activeGroupIndex) return grp;

        const alreadyExists = grp.items.some(
          (itm: any) =>
            itm.itemCode === selectedItem.itemCode &&
            itm.measCode === selectedItem.measCode
        );

        if (alreadyExists) {
          alert("Item already exists in this delivery");
          return grp;
        }
        const nextId =
          grp.items.length > 0
            ? Math.max(...grp.items.map((i: any) => i.id)) + 1
            : 1;
        return {
          ...grp,
          items: [
            ...grp.items,
            {
              id: nextId,
              itemCode: selectedItem.itemCode,
              itemName: selectedItem.itemName,
              itemType: selectedItem.itemType,
              storageType: selectedItem.storageType,
              uom: `${selectedItem.measQty}${selectedItem.uom}`,
              measCode: selectedItem.measCode,
              reqQty: 0,
              availableQty: 0,
              recommendedQty: 0,
              originalReqQty: 0,
              checked: false,
            },
          ],
        };
      })
    );

    setSelectedItem(null);
    setnewItemModal(false);
  };

  return (
    <Container fluid className="p-4">
      <Row className="mb-3 justify-content-between">
        <Col className="d-flex align-items-center">
          <Image
            src={"/inventorymanagement/back-icon.svg"}
            height={24}
            width={24}
            alt={"back"}
            onClick={() => router.back()}
            style={{ cursor: "pointer" }}
          />
          <h3 className="font-24 fw-bold m-0 ms-3">Recommended Cart Items</h3>
        </Col>
        <Col className="d-flex justify-content-end">
          <Button className="btn-filled" onClick={() => handlePlaceOrder()}>
            Send to Pantry
          </Button>
        </Col>
      </Row>

      <Row className="flex-nowrap overflow-auto">
        {cartItem?.map((cart, groupIndex) => {
          const ui = getUiState(groupIndex);
          const selectedCount = cart.items.filter((i: any) => i.checked).length;

          return (
            <Col xs={12} md={6} lg={6} key={groupIndex} className="mb-4">
              <div className="border rounded-3 overflow-hidden">
                <div className="d-flex align-items-center justify-content-between bg-gray-light p-3 border-bottom">
                  <div>
                    <h4 className="font-16 text-secondary fw-bold m-0">
                      {getDayName(new Date(cart.config.date))} Delivery
                    </h4>
                    <p className="m-0 font-13">
                      {formatDate(cart.config.date)}
                    </p>
                  </div>
                  <div className="d-flex gap-2">
                    <div
                      className={`border rounded-2 p-2 ${
                        ui.viewFilter === "UNCHANGED"
                          ? "primary-border bg-primary-light"
                          : "bg-white"
                      }`}
                      style={{ cursor: "pointer" }}
                      title="View Unchanged Items"
                      onClick={() =>
                        updateUiState(groupIndex, {
                          viewFilter:
                            ui.viewFilter === "UNCHANGED" ? "ALL" : "UNCHANGED",
                        })
                      }
                    >
                      <span
                        className={`fw-bold text-muted ${
                          ui.viewFilter === "UNCHANGED" ? "text-primary" : ""
                        }`}
                        style={{ fontSize: "12px" }}
                      >
                        Unchanged
                      </span>
                    </div>

                    <div
                      className={`border rounded-2 p-2 ${
                        ui.viewFilter === "ZERO"
                          ? "primary-border bg-primary-light"
                          : "bg-white"
                      }`}
                      style={{ cursor: "pointer" }}
                      title="View 0 Qty Items"
                      onClick={() =>
                        updateUiState(groupIndex, {
                          viewFilter: ui.viewFilter === "ZERO" ? "ALL" : "ZERO",
                        })
                      }
                    >
                      <span
                        className={`fw-bold text-muted ${
                          ui.viewFilter === "ZERO" ? "text-primary" : ""
                        }`}
                        style={{ fontSize: "12px" }}
                      >
                        0 Qty
                      </span>
                    </div>

                    <div
                      className="border rounded-2 p-2 bg-white cursor-pointer"
                      onClick={() => handleBulkMoveToNext(groupIndex)}
                    >
                      <Image
                        src={"/inventorymanagement/move-icon.svg"}
                        height={18}
                        width={18}
                        alt="move"
                      />
                    </div>
                    <div
                      className="border rounded-2 p-2 bg-white cursor-pointer"
                      onClick={() => handleHeaderDelete(groupIndex)}
                    >
                      <Image
                        src={"/inventorymanagement/delete-icon.svg"}
                        height={18}
                        width={18}
                        alt="del"
                      />
                    </div>
                    <div
                      className="border rounded-2 p-2 bg-white cursor-pointer"
                      onClick={() => {
                        setActiveGroupIndex(groupIndex);
                        setSelectedItem(null);
                        setnewItemModal(true);
                      }}
                    >
                      <Image
                        src={"/inventorymanagement/orange-plus.png"}
                        height={18}
                        width={18}
                        alt="plus"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-2 border-bottom">
                  <Form.Control
                    type="search"
                    placeholder="Search this list..."
                    className="bg-light border-0"
                    value={ui.searchText}
                    onChange={(e) =>
                      updateUiState(groupIndex, { searchText: e.target.value })
                    }
                  />
                </div>

                {selectedCount > 0 && (
                  <div className="bg-light-warning p-2 border-bottom d-flex align-items-center gap-2 animate__animated animate__fadeIn">
                    <span className="font-12 fw-bold text-nowrap">
                      {selectedCount} Selected:
                    </span>

                    <Form.Select
                      size="sm"
                      style={{ width: "60px" }}
                      value={ui.bulkOperator}
                      onChange={(e) =>
                        updateUiState(groupIndex, {
                          bulkOperator: e.target.value as any,
                        })
                      }
                    >
                      <option value="+">+</option>
                      <option value="-">-</option>
                    </Form.Select>

                    <InputGroup size="sm">
                      <Form.Control
                        type="number"
                        placeholder="0"
                        value={ui.bulkValue}
                        onChange={(e) =>
                          updateUiState(groupIndex, {
                            bulkValue: Number(e.target.value),
                          })
                        }
                      />
                      <Form.Select
                        style={{ width: "60px", backgroundColor: "#f8f9fa" }}
                        value={ui.bulkMode}
                        onChange={(e) =>
                          updateUiState(groupIndex, {
                            bulkMode: e.target.value as any,
                          })
                        }
                      >
                        <option value="VALUE">Qty</option>
                        <option value="PERCENT">%</option>
                      </Form.Select>
                    </InputGroup>

                    <Button
                      size="sm"
                      className="bg-primary primary-border"
                      onClick={() => handleBulkApply(groupIndex)}
                    >
                      Apply
                    </Button>
                  </div>
                )}

                <Datatable<OrderRow>
                  columns={getColumns(groupIndex)}
                  rowData={getFilteredItems(cart.items, groupIndex)}
                  progressPending={isLoading}
                  pagination={true}
                />
              </div>
            </Col>
          );
        })}
      </Row>

      <Modal show={newItemModal} onHide={() => setnewItemModal(false)} centered>
        <Modal.Header className="border-0">
          <Modal.Title className="font-18 fw-bold">Add New Entry</Modal.Title>
        </Modal.Header>
        <Modal.Body className="border-0">
          <Form.Select
            className="mb-3"
            value={selectedItem?.itemCode || ""}
            onChange={(e) => {
              const item = itemList.find(
                (i: any) => i.itemCode === Number(e.target.value)
              );
              setSelectedItem(item);
            }}
          >
            <option value={""}>Select Item</option>
            {itemList?.map((itm: any) => (
              <option key={itm.itemCode} value={itm.itemCode}>
                {itm.itemName} - {itm.measQty}
                {itm.uom}
              </option>
            ))}
          </Form.Select>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button
            className="btn-outline px-4"
            onClick={() => setnewItemModal(false)}
          >
            Cancel
          </Button>
          <Button className="btn-filled" onClick={handleAddNewItem}>
            Add
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
