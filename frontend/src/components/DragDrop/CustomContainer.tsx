import React, { useRef, useEffect, useState } from "react";
import { FaUpload, FaRegFile } from "react-icons/fa";
import { BsX } from "react-icons/bs";
import Swal from "sweetalert2";

export interface FileData {
  name: string;
  photo: File;
  type: string;
  size: number;
}

interface CustomDragDropProps {
  ownerLicense: FileData[];
  onUpload: (files: FileData[]) => void;
  onDelete: (index: number) => void;
  count: number;
  formats: string[];
}

export function CustomDragDrop({
  ownerLicense,
  onUpload,
  onDelete,
  count,
  formats,
}: CustomDragDropProps) {
  const dropContainer = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleDrop(
    e: React.DragEvent<HTMLDivElement> | React.ChangeEvent<HTMLInputElement>,
    type: string
  ) {
    let files: File[];
    if (type === "inputFile") {
      files = [...(e.target as HTMLInputElement).files!];
      e.target.value = ''; 
    } else {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      files = [...(e as React.DragEvent<HTMLDivElement>).dataTransfer.files];
      e.target.value = ''; 
    }

    const allFilesValid = files.every((file) => {
      return formats.some((format) => file.type.endsWith(`/${format}`));
    });

    if (ownerLicense.length >= count) {
      showAlert(
        "warning",
        "Maximum Files",
        `Only ${count} files can be uploaded`
      );
      return;
    }
    if (!allFilesValid) {
      showAlert(
        "warning",
        "Invalid Media",
        `Invalid file format. Please only upload ${formats
          .join(", ")
          .toUpperCase()}`
      );
      return;
    }
    if (count && count < files.length) {
      showAlert(
        "error",
        "Error",
        `Only ${count} file${count !== 1 ? "s" : ""} can be uploaded at a time`
      );
      return;
    }

    if (files && files.length) {
      const nFiles = files.map(async (file) => {
        return {
          name: file.name,
          photo: file,
          type: file.type,
          size: file.size,
        };
      });

      Promise.all(nFiles).then((newFiles) => {
        onUpload(newFiles);
        TopNotification.fire({
          icon: "success",
          title: "File(s) uploaded",
        });
      });
    }
  }


  useEffect(() => {
    function handleDragOver(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);
    }
    function handleDragLeave(e: DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
    }
    function handleDropEvent(e: DragEvent) {
      handleDrop(e as any, "drop");
    }

    const dropContainerRef = dropContainer.current;

    if (dropContainerRef) {
      dropContainerRef.addEventListener("dragover", handleDragOver);
      dropContainerRef.addEventListener("drop", handleDropEvent);
      dropContainerRef.addEventListener("dragleave", handleDragLeave);
    }

    return () => {
      if (dropContainerRef) {
        dropContainerRef.removeEventListener("dragover", handleDragOver);
        dropContainerRef.removeEventListener("drop", handleDropEvent);
        dropContainerRef.removeEventListener("dragleave", handleDragLeave);
      }
    };
  }, [ownerLicense]);

  const TopNotification = Swal.mixin({
    toast: true,
    position: "bottom-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener("mouseenter", Swal.stopTimer);
      toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });

  function showAlert(
    icon: "warning" | "error" | "success",
    title: string,
    text: string
  ) {
    Swal.fire({
      icon: icon,
      title: title,
      text: text,
      showConfirmButton: false,
      width: 500,
      timer: 1500,
    });
  }


  return (
    <>
      <div
        className={`${
          dragging
            ? "border border-[#2B92EC] bg-[#EDF2FF]"
            : "border-dashed border-[#e0e0e0]"
        } mx-auto mt-4 flex items-center justify-center rounded-md border-2 py-5 text-center`}
        ref={dropContainer}
      >
        <div className="flex flex-1 flex-col">
          <div className="mx-auto mb-2 text-gray-400">
            <FaUpload size={18} />
          </div>
          <div className="text-[12px] font-normal text-gray-500">
            <input
              className="hidden opacity-0"
              type="file"
              multiple
              accept="application/pdf"
              ref={fileRef}
              onChange={(e) => handleDrop(e, "inputFile")}
            />
            <span
              className="cursor-pointer text-[#4070f4]"
              onClick={() => {
                fileRef.current?.click();
              }}
            >
              Click to upload
            </span>{" "}
            or drag and drop
          </div>
          <div className="text-[10px] font-normal text-gray-500">
            Only PDF files
          </div>
        </div>
      </div>

      {ownerLicense.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
          {ownerLicense.map((file, index) => (
            <div
              key={index}
              className="w-full space-y-3 rounded-md bg-slate-200 px-3 py-3.5"
            >
              <div className="flex justify-between">
                <div className="flex w-[70%] items-center justify-start space-x-2">
                  <div className="text-[37px] text-[#5E62FF] ">
                    <FaRegFile />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-500">
                      {file.name}
                    </div>
                    <div className="text-[10px] font-medium text-gray-400">{`${Math.floor(
                      file.size / 1024
                    )} KB`}</div>
                  </div>
                </div>
                <div className="flex flex-1 justify-end">
                  <div className="space-y-1">
                    <div
                      className="cursor-pointer text-[17px] text-gray-500"
                      onClick={() => onDelete(index)}
                    >
                      <BsX className="ml-auto" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
