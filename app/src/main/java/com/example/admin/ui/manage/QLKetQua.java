package com.example.admin.ui.manage;

import android.os.Bundle;
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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

public class QLKetQua extends Fragment {
    Button  btnxem;

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
        View view = inflater.inflate(R.layout.fragment_qlketqua, container, false);


        btnxem = view.findViewById(R.id.btnxem);
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
                db.collection("Quiz").document(selectedTableId).collection("results")
                        .get()
                        .addOnCompleteListener(task -> {
                            if (task.isSuccessful()) {
                                arrayList.clear();
                                documentSnapshots.clear();
                                for (QueryDocumentSnapshot document : task.getResult()) {
                                    documentSnapshots.add(document);
                                    String item =
                                            "CurrentUserId: " + document.getString("currentUserId") + "\n" +
                                            "Correct: " + document.getLong("correct") + " | " +
                                            "NotAnswered: " + document.getLong("notAnswered") + " | " +
                                            "Time: " + document.getLong("time") + " | " +
                                            "Wrong: " + document.getLong("wrong")  ;

                                    arrayList.add(item);
                                }
                                adapter.notifyDataSetChanged();
                            } else {
                                Toast.makeText(getContext(), "Lỗi khi đọc dữ liệu", Toast.LENGTH_SHORT).show();
                            }
                        });
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
                // Xử lý khi không có chủ đề nào được chọn
            }
        });
        return view;
    }
}
