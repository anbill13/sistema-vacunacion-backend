-- Crear la base de datos
CREATE DATABASE SistemaVacunacion;
GO

-- Usar la base de datos recién creada
USE VacunacionDB;
GO

-- 1. Crear tabla Paises
CREATE TABLE Paises (
    id_pais UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre NVARCHAR(100) NOT NULL,
    gentilicio NVARCHAR(100) NOT NULL
);

-- 2. Crear tabla Niños
CREATE TABLE Niños (
    id_niño UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre_completo NVARCHAR(200) NOT NULL,
    identificacion NVARCHAR(20) NOT NULL,
    nacionalidad NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Paises(nombre),
    pais_nacimiento NVARCHAR(100) FOREIGN KEY REFERENCES Paises(nombre),
    fecha_nacimiento DATE NOT NULL,
    genero CHAR(1) NOT NULL CHECK (genero IN ('Masculino', 'Femenino', 'Otros')),
    direccion_residencia NVARCHAR(500) NULL,
    latitud DECIMAL(9,6) NULL,
    longitud DECIMAL(9,6) NULL,
    id_centro_salud UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Centros_Vacunacion(id_centro) NULL,
    contacto_principal NVARCHAR(50) NULL CHECK (contacto_principal IN ('Madre', 'Padre', 'Tutor')),
    id_salud_nacional NVARCHAR(20) NULL,
    estado NVARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
    -- Restricción de edad máxima (14 años) al momento del registro
    CONSTRAINT CHK_EdadMaxima CHECK (DATEDIFF(YEAR, fecha_nacimiento, GETDATE()) <= 14)
);

-- 3. Crear tabla Tutores
CREATE TABLE Tutores (
    id_tutor UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_niño UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Niños(id_niño) NOT NULL,
    nombre NVARCHAR(200) NOT NULL,
    relacion NVARCHAR(50) NOT NULL CHECK (relacion IN ('Madre', 'Padre', 'Tutor Legal')),
    nacionalidad NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Paises(nombre),
    identificacion NVARCHAR(20) NULL,
    telefono NVARCHAR(20) NULL,
    email NVARCHAR(100) NULL CHECK (email LIKE '%@%.%'),
    direccion NVARCHAR(500) NULL,
    estado NVARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo'))
);

-- 4. Crear tabla Centros_Vacunacion
CREATE TABLE Centros_Vacunacion (
    id_centro UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre_centro NVARCHAR(200) NOT NULL,
    nombre_corto NVARCHAR(50) NULL,
    direccion NVARCHAR(500) NULL,
    latitud DECIMAL(9,6) NULL,
    longitud DECIMAL(9,6) NULL,
    telefono NVARCHAR(20) NULL,
    director NVARCHAR(200) NULL,
    sitio_web NVARCHAR(200) NULL CHECK (sitio_web LIKE 'http%'),
    estado NVARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo'))
);

-- 5. Crear tabla Vacunas
CREATE TABLE Vacunas (
    id_vacuna UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre NVARCHAR(100) NOT NULL,
    fabricante NVARCHAR(100) NOT NULL,
    tipo NVARCHAR(50) NOT NULL,
    dosis_requeridas INT NOT NULL
);

-- 6. Crear tabla Esquema_Vacunacion
CREATE TABLE Esquema_Vacunacion (
    id_esquema UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_vacuna UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Vacunas(id_vacuna) NOT NULL,
    orden_dosis INT NOT NULL,
    edad_recomendada NVARCHAR(50) NOT NULL,
    descripcion NVARCHAR(500) NULL
);

-- 7. Crear tabla Calendarios_Nacionales
CREATE TABLE Calendarios_Nacionales (
    id_calendario UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre_pais NVARCHAR(100) FOREIGN KEY REFERENCES Paises(nombre) NOT NULL,
    descripcion NVARCHAR(500) NULL,
    id_esquema UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Esquema_Vacunacion(id_esquema) NOT NULL
);

-- 8. Crear tabla Lotes_Vacunas
CREATE TABLE Lotes_Vacunas (
    id_lote UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_vacuna UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Vacunas(id_vacuna) NOT NULL,
    numero_lote NVARCHAR(50) NOT NULL,
    cantidad_total INT NOT NULL,
    cantidad_disponible INT NOT NULL,
    fecha_fabricacion DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    id_centro UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Centros_Vacunacion(id_centro) NOT NULL,
    condiciones_almacenamiento NVARCHAR(200) NULL
);

-- 9. Crear tabla Historial_Vacunacion
CREATE TABLE Historial_Vacunacion (
    id_historial UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_niño UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Niños(id_niño) NOT NULL,
    id_lote UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Lotes_Vacunas(id_lote) NOT NULL,
    id_personal UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Personal_Salud(id_personal) NOT NULL,
    id_centro UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Centros_Vacunacion(id_centro) NULL,
    fecha_vacunacion DATETIME2 NOT NULL,
    dosis_aplicada INT NOT NULL,
    sitio_aplicacion NVARCHAR(100) NULL,
    observaciones NVARCHAR(500) NULL
    -- Nota: Edad al momento puede calcularse en BackEnd con fecha_nacimiento y fecha_vacunacion
);

-- 10. Crear tabla Inventario_Suministros
CREATE TABLE Inventario_Suministros (
    id_suministro UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre_suministro NVARCHAR(100) NOT NULL,
    tipo_suministro NVARCHAR(50) NULL,
    cantidad_total INT NOT NULL,
    cantidad_disponible INT NOT NULL,
    id_centro UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Centros_Vacunacion(id_centro) NOT NULL,
    fecha_entrada DATE NOT NULL,
    fecha_vencimiento DATE NULL,
    proveedor NVARCHAR(200) NULL,
    condiciones_almacenamiento NVARCHAR(200) NULL
);

-- 11. Crear tabla Campanas_Vacunacion
CREATE TABLE Campanas_Vacunacion (
    id_campaña UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre_campaña NVARCHAR(200) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NULL,
    objetivo NVARCHAR(500) NULL,
    id_vacuna UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Vacunas(id_vacuna) NOT NULL,
    estado NVARCHAR(20) NOT NULL CHECK (estado IN ('Planificada', 'En Curso', 'Finalizada'))
);

-- 12. Crear tabla Campana_Centro
CREATE TABLE Campana_Centro (
    id_campaña_centro UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_campaña UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Campanas_Vacunacion(id_campaña) NOT NULL,
    id_centro UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Centros_Vacunacion(id_centro) NOT NULL,
    fecha_asignacion DATE NOT NULL
);

-- 13. Crear tabla Personal_Salud
CREATE TABLE Personal_Salud (
    id_personal UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre NVARCHAR(200) NOT NULL,
    cedula NVARCHAR(20) NOT NULL,
    telefono NVARCHAR(20) NULL,
    email NVARCHAR(100) NULL CHECK (email LIKE '%@%.%'),
    id_centro UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Centros_Vacunacion(id_centro) NOT NULL,
    especialidad NVARCHAR(100) NULL
);

-- 14. Crear tabla Usuarios
CREATE TABLE Usuarios (
    id_usuario UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    nombre NVARCHAR(200) NOT NULL,
    rol NVARCHAR(50) NOT NULL CHECK (rol IN ('doctor', 'director', 'responsable', 'administrador')),
    id_centro UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Centros_Vacunacion(id_centro) NULL,
    username NVARCHAR(50) NOT NULL,
    password_hash NVARCHAR(500) NOT NULL,
    email NVARCHAR(100) NULL CHECK (email LIKE '%@%.%'),
    telefono NVARCHAR(20) NULL,
    estado NVARCHAR(20) NOT NULL CHECK (estado IN ('Activo', 'Inactivo'))
);

-- 15. Crear tabla Auditoria
CREATE TABLE Auditoria (
    id_auditoria UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    tabla_afectada NVARCHAR(100) NOT NULL,
    id_registro UNIQUEIDENTIFIER NOT NULL,
    id_usuario UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Usuarios(id_usuario) NOT NULL,
    accion NVARCHAR(20) NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT')),
    detalles NVARCHAR(500) NULL,
    ip_origen NVARCHAR(15) NULL,
    fecha_registro DATETIME2 NOT NULL
);

-- 16. Crear tabla Eventos_Adversos
CREATE TABLE Eventos_Adversos (
    id_evento UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_niño UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Niños(id_niño) NOT NULL,
    id_historial UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Historial_Vacunacion(id_historial) NOT NULL,
    descripcion_evento NVARCHAR(500) NOT NULL,
    fecha_evento DATE NOT NULL,
    gravedad NVARCHAR(20) NOT NULL CHECK (gravedad IN ('Leve', 'Moderado', 'Grave')),
    id_personal_reportante UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Personal_Salud(id_personal) NOT NULL,
    acciones_tomadas NVARCHAR(500) NULL,
    estado NVARCHAR(20) NOT NULL CHECK (estado IN ('Reportado', 'En Investigación', 'Resuelto'))
);

-- 17. Crear tabla Alertas
CREATE TABLE Alertas (
    id_alerta UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_niño UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Niños(id_niño) NOT NULL,
    tipo_alerta NVARCHAR(100) NOT NULL,
    fecha_alerta DATETIME2 NOT NULL,
    descripcion NVARCHAR(500) NULL,
    estado NVARCHAR(20) NOT NULL CHECK (estado IN ('Pendiente', 'Resuelta'))
);

-- 18. Crear tabla Citas
CREATE TABLE Citas (
    id_cita UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    id_niño UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Niños(id_niño) NOT NULL,
    id_centro UNIQUEIDENTIFIER FOREIGN KEY REFERENCES Centros_Vacunacion(id_centro) NOT NULL,
    fecha_cita DATETIME2 NOT NULL,
    estado NVARCHAR(20) NOT NULL CHECK (estado IN ('Pendiente', 'Confirmada', 'Cancelada', 'Completada'))
);
GO