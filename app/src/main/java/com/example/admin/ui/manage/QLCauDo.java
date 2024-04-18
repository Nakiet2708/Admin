package com.example.admin.ui.manage;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ListView;
import android.widget.Spinner;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.example.admin.R;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.QueryDocumentSnapshot;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.StorageReference;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

public class QLCauDo extends Fragment {
    EditText edtanswer, edtoption_a, edtoption_b, edtoption_c, edtquestion, edttimer,edtimage;
    Button btnthem, btnsua, btnxoa, btnxem , btnthemAnh;
    private static final int PICK_IMAGE_REQUEST = 1;

    ListView lv;
    private String selectedTableId = "";
    Spinner spinnerChonChuDe;
    ArrayList<String> arrayList = new ArrayList<>();
    ArrayList<String> chudeList = new ArrayList<>();
    ArrayAdapter adapter;
    FirebaseFirestore db = FirebaseFirestore.getInstance();

    // Biến lưu trữ ID của tài liệu Firestore được chọn
    String selectedDocumentId = "";
    // Biến lưu trữ danh sách các QueryDocumentSnapshot
    ArrayList<QueryDocumentSnapshot> documentSnapshots = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_qlcaudo, container, false);

        edtanswer = view.findViewById(R.id.edtanswer);
        edtoption_a = view.findViewById(R.id.edtoption_a);
        edtoption_b = view.findViewById(R.id.edtoption_b);
        edtoption_c = view.findViewById(R.id.edtoption_c);
        edtquestion = view.findViewById(R.id.edtquestion);
        edtimage = view.findViewById(R.id.edtimage);
        edttimer = view.findViewById(R.id.edttimer);
        btnthem = view.findViewById(R.id.btnthem);
        btnsua = view.findViewById(R.id.btnsua);
        btnxoa = view.findViewById(R.id.btnxoa);
        btnxem = view.findViewById(R.id.btnxem);
        btnthemAnh = view.findViewById(R.id.btnthemAnh);
        btnthemAnh.setOnClickListener(v -> openFileChooser());
        Spinner spinnerChonChuDe = view.findViewById(R.id.spinnerChonChuDe);

        lv = view.findViewById(R.id.lv);

        adapter = new ArrayAdapter<>(getContext(), android.R.layout.simple_list_item_1, arrayList);
        lv.setAdapter(adapter);

        // Tạo một ArrayAdapter để hiển thị danh sách chủ đề trong Spinner
        ArrayAdapter<String> spinnerAdapter = new ArrayAdapter<String>(getContext(), R.layout.custom_spinner_item, chudeList);
        spinnerAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerChonChuDe.setAdapter(spinnerAdapter);

        // Tải danh sách các chủ đề từ Firebase Firestore
        db.collection("Quiz")
                .get()
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful() && !task.getResult().getDocuments().isEmpty()) {
                        // Xóa danh sách chủ đề hiện tại
                        chudeList.clear();
                        for (QueryDocumentSnapshot document : task.getResult()) {
                            // Lấy title của chủ đề và thêm vào danh sách
                            String title = document.getString("title");
                            chudeList.add(title);
                        }
                        // Cập nhật dữ liệu mới cho Spinner
                        spinnerAdapter.notifyDataSetChanged();
                    } else {
                        Toast.makeText(getContext(), "Lỗi khi tải danh sách chủ đề", Toast.LENGTH_SHORT).show();
                    }
                });

        btnxem.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // Hiển thị dữ liệu từ Firestore trên ListView
                db.collection("Quiz").document(selectedTableId).collection("questions")
                        .get()
                        .addOnCompleteListener(task -> {
                            if (task.isSuccessful()) {
                                arrayList.clear();
                                documentSnapshots.clear();
                                for (QueryDocumentSnapshot document : task.getResult()) {
                                    documentSnapshots.add(document);
                                    String item =
                                            "Question: " + document.getString("question") + "\n" +
                                            "Answer: " + document.getString("answer") + "\n" +
                                            "Option_a: " + document.getString("option_a") + "\n" +
                                            "Option_b: " + document.getString("option_b") + "\n" +
                                            "Option_c: " + document.getString("option_c") + "\n" +

                                            "Timer: " + document.getLong("timer");
                                    arrayList.add(item);
                                }
                                adapter.notifyDataSetChanged();
                            } else {
                                Toast.makeText(getContext(), "Lỗi khi đọc dữ liệu", Toast.LENGTH_SHORT).show();
                            }
                        });
            }
        });

        btnthem.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                // Thêm dữ liệu vào Firestore
                String answer = edtanswer.getText().toString();
                String option_a = edtoption_a.getText().toString();
                String option_b = edtoption_b.getText().toString();
                String option_c = edtoption_c.getText().toString();
                String qimage = edtimage.getText().toString();
                String question = edtquestion.getText().toString();
                int timer = Integer.parseInt(edttimer.getText().toString());
                Map<String, Object> user = new HashMap<>();
                user.put("answer", answer);
                user.put("option_a", option_a);
                user.put("option_b", option_b);
                user.put("option_c", option_c);
                user.put("question", question);
                user.put("qimage", qimage);
                user.put("timer", timer);
                db.collection("Quiz").document(selectedTableId).collection("questions")
                        .add(user)
                        .addOnSuccessListener(new OnSuccessListener<DocumentReference>() {
                            @Override
                            public void onSuccess(DocumentReference documentReference) {
                                Toast.makeText(getContext(), "Thêm thành công", Toast.LENGTH_SHORT).show();
                            }
                        })
                        .addOnFailureListener(new OnFailureListener() {
                            @Override
                            public void onFailure(@NonNull Exception e) {
                                Toast.makeText(getContext(), "Thêm thất bại", Toast.LENGTH_SHORT).show();
                            }
                        });
            }
        });

        btnsua.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                // Kiểm tra xem đã chọn một tài liệu để sửa chưa
                if (!selectedDocumentId.isEmpty()) {
                    // Lấy nội dung mới từ EditText
                    String answer = edtanswer.getText().toString();
                    String option_a = edtoption_a.getText().toString();
                    String option_b = edtoption_b.getText().toString();
                    String option_c = edtoption_c.getText().toString();
                    String question = edtquestion.getText().toString();
                    String qimage = edtimage.getText().toString();
                    int timer = Integer.parseInt(edttimer.getText().toString());

                    // Tạo Map để cập nhật dữ liệu
                    Map<String, Object> updatedData = new HashMap<>();
                    updatedData.put("answer", answer);
                    updatedData.put("option_a", option_a);
                    updatedData.put("option_b", option_b);
                    updatedData.put("option_c", option_c);
                    updatedData.put("question", question);
                    updatedData.put("qimage", qimage);
                    updatedData.put("timer", timer);

                    // Cập nhật dữ liệu trên Firestore
                    db.collection("Quiz").document(selectedTableId).collection("questions")
                            .document(selectedDocumentId)
                            .update(updatedData)
                            .addOnSuccessListener(new OnSuccessListener<Void>() {
                                @Override
                                public void onSuccess(Void aVoid) {
                                    Toast.makeText(getContext(), "Cập nhật thành công", Toast.LENGTH_SHORT).show();
                                    // Sau khi cập nhật thành công, đặt lại giá trị của selectedDocumentId để chuẩn bị cho việc sửa tiếp theo
                                    selectedDocumentId = "";
                                }
                            })
                            .addOnFailureListener(new OnFailureListener() {
                                @Override
                                public void onFailure(@NonNull Exception e) {
                                    Toast.makeText(getContext(), "Cập nhật thất bại", Toast.LENGTH_SHORT).show();
                                }
                            });
                } else {
                    Toast.makeText(getContext(), "Vui lòng chọn một mục để sửa", Toast.LENGTH_SHORT).show();
                }
            }
        });

        btnxoa.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                // Kiểm tra xem đã chọn một tài liệu để xóa chưa
                if (!selectedDocumentId.isEmpty()) {
                    // Xóa dữ liệu trên Firestore
                    db.collection("Quiz").document(selectedTableId).collection("questions")
                            .document(selectedDocumentId)
                            .delete()
                            .addOnSuccessListener(new OnSuccessListener<Void>() {
                                @Override
                                public void onSuccess(Void aVoid) {
                                    Toast.makeText(getContext(), "Xóa thành công", Toast.LENGTH_SHORT).show();
                                    // Sau khi xóa thành công, đặt lại giá trị của selectedDocumentId để chuẩn bị cho việc xóa tiếp theo
                                    selectedDocumentId = "";
                                }
                            })
                            .addOnFailureListener(new OnFailureListener() {
                                @Override
                                public void onFailure(@NonNull Exception e) {
                                    Toast.makeText(getContext(), "Xóa thất bại", Toast.LENGTH_SHORT).show();
                                }
                            });
                } else {
                    Toast.makeText(getContext(), "Vui lòng chọn một mục để xóa", Toast.LENGTH_SHORT).show();
                }
            }
        });

        lv.setOnItemClickListener((parent, view1, position, id) -> {
            // Lấy ID của tài liệu Firestore được chọn
            selectedDocumentId = documentSnapshots.get(position).getId();
            // Hiển thị dữ liệu của tài liệu được chọn lên EditText
            Map<String, Object> selectedData = documentSnapshots.get(position).getData();
            if (selectedData != null) {
                String question = selectedData.get("question") != null ? selectedData.get("question").toString() : "";
                String optionA = selectedData.get("option_a") != null ? selectedData.get("option_a").toString() : "";
                String optionB = selectedData.get("option_b") != null ? selectedData.get("option_b").toString() : "";
                String optionC = selectedData.get("option_c") != null ? selectedData.get("option_c").toString() : "";
                String answer = selectedData.get("answer") != null ? selectedData.get("answer").toString() : "";
                String qimage = selectedData.get("qimage") != null ? selectedData.get("qimage").toString() : "";
                String timer = selectedData.get("timer") != null ? String.valueOf(selectedData.get("timer")) : "";

                edtquestion.setText(question);
                edtoption_a.setText(optionA);
                edtoption_b.setText(optionB);
                edtoption_c.setText(optionC);
                edtanswer.setText(answer);
                edtimage.setText(qimage);
                edttimer.setText(timer);
            }
        });
        // Xử lý sự kiện chọn chủ đề từ Spinner
        spinnerChonChuDe.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                // Lấy title của chủ đề được chọn
                String selectedChuDe = chudeList.get(position);

                // Tìm ID của chủ đề được chọn trong danh sách chủ đề
                db.collection("Quiz")
                        .whereEqualTo("title", selectedChuDe)
                        .get()
                        .addOnCompleteListener(task -> {
                            if (task.isSuccessful() && !task.getResult().getDocuments().isEmpty()) {
                                // Lấy ID của bảng dữ liệu được chọn
                                selectedTableId = task.getResult().getDocuments().get(0).getId();
                            }
                        });
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {
            }
        });




        return view;
    }
    private void openFileChooser() {
        Intent intent = new Intent();
        intent.setType("image/*");
        intent.setAction(Intent.ACTION_GET_CONTENT);
        startActivityForResult(intent, PICK_IMAGE_REQUEST);
    }

    // Hàm xử lý dữ liệu trả về từ bộ chọn hình ảnh
    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == PICK_IMAGE_REQUEST && resultCode == Activity.RESULT_OK
                && data != null && data.getData() != null) {
            Uri imageUri = data.getData();

            // Tạo một đối tượng StorageReference, xác định vị trí lưu trữ trên Firebase
            String fileName = getFileName(imageUri);
            StorageReference storageRef = FirebaseStorage.getInstance().getReference().child("images/" + fileName);

            // Kiểm tra xem edtimage có null hay không
            if (edtimage != null) {
                // Tải hình ảnh lên Firebase Storage
                storageRef.putFile(imageUri)
                        .addOnSuccessListener(taskSnapshot -> {
                            // Lấy URL của hình ảnh sau khi đã được tải lên
                            storageRef.getDownloadUrl().addOnSuccessListener(uri -> {
                                // Hiển thị URL của hình ảnh trên EditText
                                edtimage.setText(uri.toString());
                            });
                        })
                        .addOnFailureListener(e -> {
                            // Xử lý khi có lỗi xảy ra trong quá trình tải hình ảnh lên Storage
                            Toast.makeText(getContext(), "Lỗi khi tải hình ảnh lên Storage: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                        });
            }
        }
    }

    // Hàm lấy tên hình ảnh từ Uri
    private String getFileName(Uri uri) {
        String result = null;
        if (uri.getScheme().equals("content")) {
            Cursor cursor = getActivity().getContentResolver().query(uri, null, null, null, null);
            try {
                if (cursor != null && cursor.moveToFirst()) {
                    result = cursor.getString(cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME));
                }
            } finally {
                if (cursor != null) {
                    cursor.close();
                }
            }
        }
        if (result == null) {
            result = uri.getPath();
            int cut = result.lastIndexOf('/');
            if (cut != -1) {
                result = result.substring(cut + 1);
            }
        }
        return result;
    }
}
