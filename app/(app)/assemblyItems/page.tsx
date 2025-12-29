"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Row, Col, Container, Form, Button } from "react-bootstrap";
import Datatable from "@/app/components/Datatable";
import { TableColumn } from "react-data-table-component";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCallApiMutation } from "@/app/store/services/apiSlice";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";

interface AssemblyItem {
  id?: number;
  itemCode: number;
  itemName: string;
  itemType: string;
  maxQty: number;
  storageType: "FRIDGE" | "FREEZER" | "OTHER";
}

export default function Page() {
  const router = useRouter();
  const [callApi, { isLoading }] = useCallApiMutation();

  const [assemblyItemsList, setAssemblyItemsList] = useState<
    AssemblyItem[] | null
  >(null);
  const [originalItemsList, setOriginalItemsList] = useState<AssemblyItem[]>([]);
  const [modifiedItems, setModifiedItems] = useState<AssemblyItem[]>([]);
  const [searchText, setSearchText] = useState("");

  const loginDetails = useSelector(
    (state: RootState) => state.auth.login_Details
  );
  const rehydrated = useSelector(
    (state: RootState) => state._persist?.rehydrated
  );

  const filteredItems = useMemo(() => {
    if (!assemblyItemsList) return [];
    if (!searchText) return assemblyItemsList;

    const lowerSearch = searchText.toLowerCase();

    return assemblyItemsList.filter((item) => {
      return (
        item.itemName.toLowerCase().includes(lowerSearch) ||
        item.itemCode.toString().includes(lowerSearch)
      );
    });
  }, [assemblyItemsList, searchText]);

  const updateModifiedList = useCallback(
    (newItem: AssemblyItem) => {
      setModifiedItems((prevModified) => {
        const originalItem = originalItemsList.find(
          (item) => item.id === newItem.id
        );
        if (!originalItem) return prevModified;

        const isDifferent =
          newItem.storageType !== originalItem.storageType ||
          newItem.maxQty !== originalItem.maxQty;

        const filtered = prevModified.filter((item) => item.id !== newItem.id);

        if (isDifferent) {
          return [...filtered, newItem];
        } else {
          return filtered;
        }
      });
    },
    [originalItemsList]
  );

  const handleStorageChange = useCallback(
    (id: number | undefined, newValue: string) => {
      if (!id) return;

      setAssemblyItemsList((prevItems) => {
        if (!prevItems) return null;

        return prevItems.map((item) => {
          if (item.id === id) {
            const updatedItem = {
              ...item,
              storageType: newValue as "FRIDGE" | "FREEZER" | "OTHER",
            };
            updateModifiedList(updatedItem);
            return updatedItem;
          }
          return item;
        });
      });
    },
    [updateModifiedList]
  );

  const handleMaxQtyChange = useCallback(
    (id: number | undefined, newValue: string) => {
      if (!id) return;

      setAssemblyItemsList((prevItems) => {
        if (!prevItems) return null;

        return prevItems.map((item) => {
          if (item.id === id) {
            const updatedItem = { ...item, maxQty: Number(newValue) };
            updateModifiedList(updatedItem);
            return updatedItem;
          }
          return item;
        });
      });
    },
    [updateModifiedList]
  );

  const columns: TableColumn<AssemblyItem>[] = useMemo(
    () => [
      {
        name: "#",
        selector: (row) => row.id || 0,
        width: "60px",
        sortable: true,
      },
      {
        name: "Item Code",
        selector: (row) => row.itemCode,
        width: "150px",
        sortable: true,
      },
      {
        name: "Item Name",
        selector: (row) => row.itemName,
        sortable: true,
      },
      {
        name: "Storage Type",
        selector: (row) => row.storageType,
        sortable: true,
        cell: (row) => (
          <Form.Select
            value={row.storageType || ""}
            onChange={(e) => handleStorageChange(row.id, e.target.value)}
            className="cursor-pointer"
          >
            <option value="">Select</option>
            <option value="FRIDGE">FRIDGE</option>
            <option value="FREEZER">FREEZER</option>
            <option value="OTHER">OTHER</option>
          </Form.Select>
        ),
      },
      {
        name: "Max Quantity",
        selector: (row) => row.maxQty,
        sortable: true,
        center: true,
        width: "160px",
        cell: (row) => (
          <Form.Control
            type="number"
            className={`text-center`}
            value={row.maxQty}
            onChange={(e) => handleMaxQtyChange(row.id, e.target.value)}
          />
        ),
      },
    ],
    [handleStorageChange, handleMaxQtyChange]
  );

  useEffect(() => {
    const handleGetAssemblyItems = async () => {
      try {
        let res = await callApi({
          url: `StoreCtl/get-kitchen-assembly-items-list/${loginDetails?.cloudKitchenId}`,
        }).unwrap();

        if (res.status) {
          console.log("Assembly Items:", res.object);
          const updatedData: AssemblyItem[] =
            (res.object as AssemblyItem[])?.map(
              (order: AssemblyItem, index: number) => ({
                ...order,
                id: index + 1,
              })
            ) ?? [];

          setAssemblyItemsList(updatedData);
          setOriginalItemsList(JSON.parse(JSON.stringify(updatedData)));
          setModifiedItems([]);
        } else {
          alert(res.message);
        }
      } catch (error) {
        console.error("API error", error);
      }
    };

    if (rehydrated && loginDetails) {
      handleGetAssemblyItems();
    }
  }, [rehydrated, loginDetails, callApi]);

  const handleUpdateAssemblyItems = async () => {
    try {
      if (modifiedItems.length === 0) {
        alert("No changes to apply.");
        return;
      }

      const payload = modifiedItems.map(({ id, ...item }) => item);
      console.log("Sending payload:", payload);

      let res = await callApi({
        url: `StoreCtl/update-assembly-item-basic-details`,
        body: payload as any,
      }).unwrap();

      if (res.status) {
        alert("Assembly items updated successfully.");
        setOriginalItemsList(JSON.parse(JSON.stringify(assemblyItemsList)));
        setModifiedItems([]);
      } else {
        alert(res.message);
      }
    } catch (error) {
      console.error("API error", error);
    }
  };

  return (
    <Container fluid className="p-4">
      <Row className="justify-content-between align-items-center">
        <Col xs={12} md={6} className="d-flex align-items-center mb-3 mb-md-0">
          <Image
            src={"/inventorymanagement/back-icon.svg"}
            height={24}
            width={24}
            alt={"backicon"}
            onClick={() => {
              router.push("/orders");
            }}
            style={{ cursor: "pointer" }}
          />
          <h3 className="font-24 fw-bold m-0 ms-3">Assembly Items</h3>
        </Col>

        <Col xs={12} md={4} lg={3}>
          <Form.Control
            type="search"
            placeholder="Search items..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
      </Row>

      <Row className="mt-4">
        <Datatable<AssemblyItem>
          columns={columns}
          rowData={filteredItems}
          pagination={true}
          progressPending={isLoading}
        />
      </Row>
      <Col className="d-flex justify-content-end mt-4">
        <Button
          className="btn-outline float-end me-3 py-2 px-5"
          onClick={() => {
            router.back();
          }}
        >
          Cancel
        </Button>
        <Button
          className="btn-filled float-end py-2 px-5"
          onClick={() => {
            handleUpdateAssemblyItems();
          }}
          disabled={modifiedItems.length === 0}
        >
          Apply ({modifiedItems.length})
        </Button>
      </Col>
    </Container>
  );
}
