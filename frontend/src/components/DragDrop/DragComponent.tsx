import React from "react";
import { CustomDragDrop } from "./CustomContainer";
import { FileData } from "./CustomContainer"; // Import the FileData interface

interface DragComponentProps {
  ownerLicense: FileData[];
  setOwnerLicense: React.Dispatch<React.SetStateAction<FileData[]>>;
}

export default function DragComponent({ ownerLicense, setOwnerLicense }: DragComponentProps) {

  function uploadFiles(f: FileData[]) {
    console.error(ownerLicense);
    setOwnerLicense([...ownerLicense, ...f]);
  }

  function deleteFile(indexImg: number) {
    const updatedList = ownerLicense.filter((ele, index) => index !== indexImg);
    setOwnerLicense(updatedList);

  }

  return (
    <div className="bg-white shadow rounded-lg w-full px-5 pt-3 pb-5">
      <CustomDragDrop
        ownerLicense={ownerLicense}
        onUpload={uploadFiles}
        onDelete={deleteFile}
        count={10}
        formats={["pdf"]}
      />
    </div>
  );
}
