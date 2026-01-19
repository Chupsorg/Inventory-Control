"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Row, Col, Container, Form, Button, Modal } from "react-bootstrap";
import Datatable from "@/app/components/Datatable";
import { TableColumn } from "react-data-table-component";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCallApiMutation } from "@/app/store/services/apiSlice";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { exportToExcel } from "@/app/utils/exportToExcel";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

interface Chef {
    name: string;
    id: number;
    preparedBy: string;
}

interface AssemblyItem {
    id?: number;
    itemCode: number;
    itemName: string;
    uom: string;
    measQty: number;
    qty?: number;
    preparedByList: Chef[];
    itemType: string;
    maxQty: number;
    storageType: "FRIDGE" | "FREEZER" | "OTHER";
}
interface AssemblyItemExcelRow {
    id?: number;
    itemCode: number;
    itemName: string;
    uom: string;
    preparedBy: string;
    storageType: string;
    maxQty: number;
}

export default function Page() {
    const router = useRouter();
    const [callApi, { isLoading }] = useCallApiMutation();

    const [assemblyItemsList, setAssemblyItemsList] = useState<
        AssemblyItem[] | null
    >(null);
    const [originalItemsList, setOriginalItemsList] = useState<AssemblyItem[]>(
        []
    );
    const [modifiedItems, setModifiedItems] = useState<AssemblyItem[]>([]);
    const [chefList, setChefList] = useState<Chef[]>([]);
    const [searchText, setSearchText] = useState("");
    const [showFilterModal, setshowFilterModal] = useState(false);
    const [range, setRange] = useState<[number, number]>([50, 100]);
    
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
                (item.itemName && item.itemName.toLowerCase().includes(lowerSearch)) ||
                (item.itemCode && item.itemCode.toString().includes(lowerSearch))
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

                const isStorageDifferent =
                    newItem.storageType !== originalItem.storageType;
                const isQtyDifferent = newItem.maxQty !== originalItem.maxQty;

                const oldChefId = originalItem.preparedByList?.[0]?.id;
                const newChefId = newItem.preparedByList?.[0]?.id;
                const isChefDifferent = oldChefId !== newChefId;

                const isDifferent =
                    isStorageDifferent || isQtyDifferent || isChefDifferent;
                const filtered = prevModified.filter((item) => item.id !== newItem.id);

                return isDifferent ? [...filtered, newItem] : filtered;
            });
        },
        [originalItemsList]
    );

    const handleSelectChef = useCallback(
        (id: number | undefined, newValue: string) => {
            if (!id) return;

            setAssemblyItemsList((prevItems) => {
                if (!prevItems) return null;

                return prevItems.map((item) => {
                    if (item.id === id) {
                        const selectedChef = chefList.find(
                            (chef) => chef.id === Number(newValue)
                        );
                        const updatedItem = {
                            ...item,
                            preparedByList: selectedChef ? [selectedChef] : [],
                        };
                        updateModifiedList(updatedItem);
                        return updatedItem;
                    }
                    return item;
                });
            });
        },
        [chefList, updateModifiedList]
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
                name: "Item Name",
                selector: (row) => row.itemName,
                sortable: true,
            },
            {
                name: "Prepared By",
                selector: (row) => row.preparedByList?.[0]?.preparedBy || "-",
                sortable: true,
            },
            {
                name: "Storage Type",
                selector: (row) => row.storageType || "N/A",
                sortable: true
            },
            {
                name: "Min. Stock",
                selector: (row) => row.maxQty,
                sortable: true,
                center: true,
                width: "160px"
            },
            {
                name: "Max. Stock",
                selector: (row) => row.maxQty,
                sortable: true,
                center: true,
                width: "160px"
            },
            {
                name: "Current Stock",
                selector: (row) => row.maxQty,
                sortable: true,
                center: true,
                width: "160px"
            },
        ],
        [handleStorageChange, handleMaxQtyChange, handleSelectChef, chefList]
    );

    useEffect(() => {
        const handleGetAssemblyItems = async () => {
            try {
                let resChefs = await callApi({
                    url: `StoreCtl/get-assembly-items-chefs-list`,
                }).unwrap();
                if (resChefs.status) setChefList(resChefs.object as Chef[]);

                let resItems = await callApi({
                    url: `StoreCtl/get-kitchen-assembly-items-list/${loginDetails?.cloudKitchenId}`,
                }).unwrap();

                if (resItems.status) {
                    const updatedData: AssemblyItem[] =
                        (resItems.object as AssemblyItem[])?.map(
                            (order: AssemblyItem, index: number) => ({
                                ...order,
                                id: index + 1,
                            })
                        ) ?? [];
                    setAssemblyItemsList(updatedData);
                    setOriginalItemsList(JSON.parse(JSON.stringify(updatedData)));
                    setModifiedItems([]);
                }
            } catch (error) {
                console.error("API error", error);
            }
        };

        if (rehydrated && loginDetails) handleGetAssemblyItems();
    }, [rehydrated, loginDetails, callApi]);

    const handleUpdateAssemblyItems = async () => {
        try {
            if (modifiedItems.length === 0) return;

            const payload = modifiedItems.map((item) => ({
                ...item,
                qty: item.measQty,
                chefIdList: item.preparedByList.map((chef) => chef.id),
            }));

            let res = await callApi({
                url: `StoreCtl/update-assembly-item-basic-details`,
                body: payload as any,
            }).unwrap();

            if (res.status) {
                alert("Assembly items updated successfully.");
                if (assemblyItemsList)
                    setOriginalItemsList(JSON.parse(JSON.stringify(assemblyItemsList)));
                setModifiedItems([]);
            }
        } catch (error) {
            console.error("Update error", error);
        }
    };
    const handleDownloadExcel = () => {
        if (!filteredItems.length) return;

        const exceldata: AssemblyItemExcelRow[] = filteredItems.map((item) => ({
            id: item.id,
            itemCode: item.itemCode,
            itemName: item.itemName,
            uom: `${item.measQty} ${item.uom}`,
            preparedBy: item.preparedByList?.[0]?.name || "-",
            storageType: item.storageType || "N/A",
            maxQty: item.maxQty,
        }));
        exportToExcel(
            [
                {
                    sheetName: "Assembly Items",
                    data: exceldata,
                    columns: [
                        { header: "#", key: "id" },
                        { header: "Item Name", key: "itemName" },
                        { header: "Item Code", key: "itemCode" },
                        { header: "UOM", key: "uom" },
                        { header: "Prepared By", key: "preparedBy" },
                        { header: "storageType", key: "storageType" },
                        { header: "maxQty", key: "maxQty" },
                    ],
                },
            ],
            `Assembly_Items`
        );
    }

    return (
        <Container fluid className="p-4">
            <Row className="justify-content-between align-items-center">
                <Col xs={12} md={6} className="d-flex align-items-center mb-3 mb-md-0">
                    <h3 className="font-24 fw-bold m-0 ms-3">Dashboard</h3>
                </Col>
                <Col xs={12} md={4} className="d-flex">
                    <Form.Control
                        type="search"
                        placeholder="Search items..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                    <div className="p-1 px-2 border rounded-2 ms-2" onClick={() => { setshowFilterModal(true) }}>
                        <Image src={"filter-icon.svg"} height={18} width={18} alt="" />
                    </div>
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
            <Modal
                show={showFilterModal}
                onHide={() => {
                    setshowFilterModal(false);
                }}
                centered
            >
                <Modal.Header className="border-0">
                    <Modal.Title className="font-18 fw-bold">Filter</Modal.Title>
                </Modal.Header>
                <Modal.Body className="border-0">
                    <Form.Control type="text" className="mb-3" placeholder="Search name of mom, prepared chef" />
                    <div className="d-flex align-items-center gap-5">
                        <div className="d-flex">
                            <Form.Check
                                type="checkbox"
                                className="rb-orange-check p-0"
                            />
                            <span className="ms-2">Fridge</span>
                        </div>
                        <div className="d-flex">
                            <Form.Check
                                type="checkbox"
                                className="rb-orange-check p-0"
                            />
                            <span className="ms-2">Freezer</span>
                        </div>
                    </div>
                    <div className="d-flex justify-content-between mb-2 mt-3">
                        <strong>Current Stock</strong>
                        <span>{range[0]}–{range[1]}</span>
                    </div>
                    <Slider
                        range
                        min={0}
                        max={200}
                        value={range}
                        onChange={(val) => setRange(val as [number, number])}
                        className="stock-slider"
                    />
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button
                        className="btn-outline px-4"
                        onClick={() => {

                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="btn-filled"
                    >
                        Apply
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}
